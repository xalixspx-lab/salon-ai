import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  decryptToken,
  isReplyWindowOpen,
  shouldAdvanceStatus,
  type InboundMessage,
  type StatusUpdate,
} from '@/lib/whatsappCore';

// تكامل واتساب مع قاعدة البيانات: استقبال الرسائل والحالات، وإرسال ردود المالك.

const apiBase = () => (process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com').replace(/\/$/, '');
const apiVersion = () => process.env.WHATSAPP_API_VERSION || 'v21.0';

const last8 = (p: string) => p.replace(/\D/g, '').slice(-8);

// يطابق سجل CRM موجود بآخر 8 أرقام (تختلف صيغ الكتابة: 33123456 / +97333123456) أو ينشئ سجلًا جديدًا
async function resolveCustomerId(tenantId: string, phone: string, name: string | null): Promise<string> {
  const tail = last8(phone);
  const candidates = await prisma.customer.findMany({
    where: { tenantId, phone: { contains: tail } },
    select: { id: true, phone: true },
    take: 10,
  });
  const hit = candidates.find((c) => c.phone && last8(c.phone) === tail);
  if (hit) return hit.id;
  const created = await prisma.customer.create({
    data: { tenantId, name: name || `+${phone}`, phone },
    select: { id: true },
  });
  return created.id;
}

export type InboundResult =
  | { kind: 'ignored' }
  | { kind: 'duplicate' }
  | { kind: 'stored'; tenantId: string; conversationId: string; messageId: string; contactName: string };

export async function processInbound(m: InboundMessage): Promise<InboundResult> {
  const account = await prisma.whatsappAccount.findUnique({ where: { phoneNumberId: m.phoneNumberId } });
  if (!account || account.status !== 'ACTIVE') return { kind: 'ignored' };
  const tenantId = account.tenantId;

  if (await prisma.message.findUnique({ where: { waMessageId: m.id }, select: { id: true } })) {
    return { kind: 'duplicate' };
  }

  const existing = await prisma.contact.findUnique({ where: { tenantId_phone: { tenantId, phone: m.from } } });
  const customerId = existing?.customerId ?? (await resolveCustomerId(tenantId, m.from, m.profileName));
  const contact = await prisma.contact.upsert({
    where: { tenantId_phone: { tenantId, phone: m.from } },
    create: { tenantId, phone: m.from, name: m.profileName, customerId, lastInboundAt: m.timestamp },
    update: {
      customerId,
      lastInboundAt: m.timestamp,
      ...(m.profileName && !existing?.name ? { name: m.profileName } : {}),
    },
  });

  const conversation = await prisma.conversation.upsert({
    where: { tenantId_contactId: { tenantId, contactId: contact.id } },
    create: { tenantId, contactId: contact.id, lastInboundAt: m.timestamp, lastMessageAt: m.timestamp },
    update: { lastInboundAt: m.timestamp, lastMessageAt: m.timestamp },
  });

  try {
    const msg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        tenantId,
        senderRole: 'CUSTOMER',
        direction: 'IN',
        body: m.text,
        waMessageId: m.id,
        msgType: m.type,
        mediaId: m.mediaId,
        createdAt: m.timestamp,
      },
    });
    return { kind: 'stored', tenantId, conversationId: conversation.id, messageId: msg.id, contactName: contact.name || `+${contact.phone}` };
  } catch (e) {
    // سباق نادر: وصل نفس الحدث مرتين بالتوازي
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { kind: 'duplicate' };
    throw e;
  }
}

export async function processStatus(s: StatusUpdate): Promise<void> {
  const msg = await prisma.message.findUnique({ where: { waMessageId: s.id }, select: { id: true, status: true } });
  if (!msg || !shouldAdvanceStatus(msg.status, s.status)) return;
  await prisma.message.update({ where: { id: msg.id }, data: { status: s.status, error: s.error } });
}

export type SendResult =
  | { ok: true; waMessageId: string }
  | { ok: false; code: 'NOT_CONNECTED' | 'NO_TOKEN' | 'WINDOW_CLOSED' | 'TOKEN_INVALID' | 'FAILED'; detail?: string };

async function tokenFor(account: { accessTokenEnc: string | null }): Promise<string | null> {
  if (account.accessTokenEnc) return decryptToken(account.accessTokenEnc);
  return process.env.WHATSAPP_ACCESS_TOKEN || null;
}

export async function sendWhatsAppText(tenantId: string, to: string, body: string): Promise<SendResult> {
  const account = await prisma.whatsappAccount.findUnique({ where: { tenantId } });
  if (!account || account.status !== 'ACTIVE') return { ok: false, code: 'NOT_CONNECTED' };
  const token = await tokenFor(account);
  if (!token) return { ok: false, code: 'NO_TOKEN' };

  try {
    const res = await fetch(`${apiBase()}/${apiVersion()}/${account.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: false, body } }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => null)) as {
      messages?: Array<{ id?: string }>;
      error?: { code?: number; message?: string };
    } | null;
    const id = json?.messages?.[0]?.id;
    if (res.ok && id) return { ok: true, waMessageId: id };
    const code = json?.error?.code;
    if (code === 131047 || code === 131026) return { ok: false, code: 'WINDOW_CLOSED', detail: json?.error?.message };
    if (code === 190) return { ok: false, code: 'TOKEN_INVALID', detail: json?.error?.message };
    return { ok: false, code: 'FAILED', detail: `${res.status} ${json?.error?.message ?? ''}`.trim() };
  } catch (e) {
    return { ok: false, code: 'FAILED', detail: e instanceof Error ? e.message : 'network error' };
  }
}

// رد المالك على محادثة واتساب: يتحقق من نافذة 24 ساعة، يرسل، ثم يخزّن الرسالة بحالتها
export async function sendOwnerReply(conversationId: string, tenantId: string, text: string) {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId },
    include: { contact: { select: { phone: true } } },
  });
  if (!conv?.contact) return { ok: false as const, code: 'NOT_WHATSAPP' as const };
  if (!isReplyWindowOpen(conv.lastInboundAt)) return { ok: false as const, code: 'WINDOW_CLOSED' as const };

  const sent = await sendWhatsAppText(tenantId, conv.contact.phone, text);
  if (!sent.ok) return sent;

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, tenantId, senderRole: 'OWNER', direction: 'OUT', body: text, waMessageId: sent.waMessageId, status: 'sent' },
    }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ]);
  return { ok: true as const, message };
}

// إرسال قالب معتمد (يعمل خارج نافذة 24 ساعة): تذكير موعد، اشتقنا لك...
export async function sendWhatsAppTemplate(tenantId: string, to: string, name: string, lang: string, params: string[]): Promise<SendResult> {
  const account = await prisma.whatsappAccount.findUnique({ where: { tenantId } });
  if (!account || account.status !== 'ACTIVE') return { ok: false, code: 'NOT_CONNECTED' };
  const token = await tokenFor(account);
  if (!token) return { ok: false, code: 'NO_TOKEN' };
  try {
    const res = await fetch(`${apiBase()}/${apiVersion()}/${account.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: { name, language: { code: lang }, components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }] },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => null)) as { messages?: Array<{ id?: string }>; error?: { code?: number; message?: string } } | null;
    const id = json?.messages?.[0]?.id;
    if (res.ok && id) return { ok: true, waMessageId: id };
    if (json?.error?.code === 190) return { ok: false, code: 'TOKEN_INVALID', detail: json.error.message };
    return { ok: false, code: 'FAILED', detail: `${res.status} ${json?.error?.message ?? ''}`.trim() };
  } catch (e) {
    return { ok: false, code: 'FAILED', detail: e instanceof Error ? e.message : 'network error' };
  }
}

// يسجّل القالب الصادر في محادثة العميل (ينشئ جهة الاتصال والمحادثة عند الحاجة) ليظهر في صندوق المالك
export async function recordOutboundTemplate(tenantId: string, phone: string, customerId: string | null, kind: 'reminder' | 'winback', preview: string, waMessageId: string) {
  const contact = await prisma.contact.upsert({
    where: { tenantId_phone: { tenantId, phone } },
    create: { tenantId, phone, customerId },
    update: customerId ? { customerId } : {},
  });
  const conversation = await prisma.conversation.upsert({
    where: { tenantId_contactId: { tenantId, contactId: contact.id } },
    create: { tenantId, contactId: contact.id },
    update: { lastMessageAt: new Date() },
  });
  await prisma.message.create({
    data: { conversationId: conversation.id, tenantId, senderRole: 'OWNER', direction: 'OUT', body: preview, waMessageId, msgType: `template:${kind}`, status: 'sent' },
  });
}

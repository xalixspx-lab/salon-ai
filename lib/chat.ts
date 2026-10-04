import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const SENDER_ROLE = { CUSTOMER: 'CUSTOMER', OWNER: 'OWNER' } as const;
export type SenderRole = (typeof SENDER_ROLE)[keyof typeof SENDER_ROLE];

export const MESSAGE_MAX_LENGTH = 2000;
export const THREAD_PAGE_SIZE = 200;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

// جسم JSON قد يكون null أو غير كائن؛ نرجع دائمًا كائنًا آمن القراءة
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
}

// آخر THREAD_PAGE_SIZE رسالة بترتيب زمني تصاعدي — يمنع تضخم الاستجابة في محادثة طويلة
export async function loadThread(conversationId: string) {
  const rows = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: THREAD_PAGE_SIZE,
    select: { id: true, senderRole: true, body: true, createdAt: true },
  });
  return rows.reverse();
}

// يرسل رسالة داخل محادثة قائمة ويحدّث وقت آخر رسالة بها في معاملة واحدة —
// مشتركة بين مسار المالك ومسار العميل حتى لا يتكرر منطق التحديث الذرّي
const NOTIFY_QUIET_MS = 15 * 60 * 1000;
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// بريد للطرف الآخر عند وصول رسالة جديدة (يعمل في after() فلا يؤخر الرد). لا يُرسل
// إلا في بداية "دفعة" رسائل — إن أرسل نفس الطرف رسالة خلال آخر 15 دقيقة نصمت
// حتى لا يغرق المستلم ببريد لكل رسالة. الفشل لا يؤثر على الإرسال أبدًا
export async function notifyChatMessage(conversationId: string, senderRole: SenderRole, messageId: string, body: string) {
  try {
    const recent = await prisma.message.count({
      where: {
        conversationId,
        senderRole,
        id: { not: messageId },
        createdAt: { gt: new Date(Date.now() - NOTIFY_QUIET_MS) },
      },
    });
    if (recent > 0) return;

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        tenantId: true,
        tenant: { select: { name: true, owner: { select: { email: true, suspendedAt: true } } } },
        account: { select: { name: true, email: true, suspendedAt: true } },
      },
    });
    if (!conv) return;

    const origin = process.env.APP_URL?.replace(/\/$/, '');
    const toOwner = senderRole === SENDER_ROLE.CUSTOMER;
    const to = toOwner ? conv.tenant.owner : conv.account;
    if (!to?.email || to.suspendedAt) return;

    const fromName = toOwner ? conv.account.name : conv.tenant.name;
    const link = origin ? (toOwner ? `${origin}/ar/dashboard` : `${origin}/ar/salons/${conv.tenantId}`) : null;
    const excerpt = body.length > 160 ? `${body.slice(0, 160)}…` : body;
    const subject = `رسالة جديدة من ${fromName} | New message from ${fromName}`;
    const text = `${subject}\n\n"${excerpt}"${link ? `\n\n${link}` : ''}`;
    const html = `<div style="font-family:sans-serif"><h3>${esc(subject)}</h3><p style="background:#f4f4f5;padding:10px 14px;border-radius:8px">${esc(excerpt)}</p>${
      link ? `<p><a href="${link}">فتح المحادثة / Open the chat</a></p>` : ''
    }</div>`;
    await sendEmail({ to: to.email, subject, text, html });
  } catch (error) {
    console.error('notifyChatMessage failed:', error);
  }
}

export async function sendMessage(conversationId: string, tenantId: string, senderRole: SenderRole, body: string) {
  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, tenantId, senderRole, body } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ]);
  return message;
}

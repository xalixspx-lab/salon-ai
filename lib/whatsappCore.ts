import crypto from 'node:crypto';

// أجزاء نقية (بلا قاعدة بيانات ولا شبكة) من تكامل واتساب — سهلة الاختبار.

export const REPLY_WINDOW_MS = 24 * 3600 * 1000;

// نافذة الرد الحر: 24 ساعة من آخر رسالة واردة من العميل. خارجها يلزم قالب معتمد.
export function isReplyWindowOpen(lastInboundAt: Date | null | undefined, now = Date.now()): boolean {
  return Boolean(lastInboundAt) && now - lastInboundAt!.getTime() < REPLY_WINDOW_MS;
}

// X-Hub-Signature-256: sha256=<hex> لـHMAC على النص الخام للطلب بمفتاح App Secret
export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !appSecret || !header.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest();
  let given: Buffer;
  try {
    given = Buffer.from(header.slice(7), 'hex');
  } catch {
    return false;
  }
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export type InboundMessage = {
  phoneNumberId: string;
  from: string;
  profileName: string | null;
  id: string;
  timestamp: Date;
  type: string;
  text: string;
  mediaId: string | null;
};
export type StatusUpdate = {
  phoneNumberId: string;
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  error: string | null;
};

const TYPE_PLACEHOLDER: Record<string, string> = {
  audio: '🎤 رسالة صوتية',
  image: '🖼️ صورة',
  video: '🎬 فيديو',
  document: '📎 ملف',
  sticker: 'ملصق',
  location: '📍 موقع',
  contacts: '👤 جهة اتصال',
  reaction: '',
};

// يستخرج الرسائل الواردة وتحديثات الحالة من حمولة Webhook الخاصة بـMeta
export function parseWebhook(payload: unknown): { messages: InboundMessage[]; statuses: StatusUpdate[] } {
  const messages: InboundMessage[] = [];
  const statuses: StatusUpdate[] = [];
  const entries = (payload as { entry?: unknown[] } | null)?.entry;
  if (!Array.isArray(entries)) return { messages, statuses };

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> })?.value;
      if (!value) continue;
      const phoneNumberId = (value.metadata as { phone_number_id?: string } | undefined)?.phone_number_id;
      if (!phoneNumberId) continue;

      const contacts = (value.contacts as Array<{ wa_id?: string; profile?: { name?: string } }> | undefined) ?? [];
      const nameByWaId = new Map(contacts.map((c) => [c.wa_id, c.profile?.name ?? null]));

      for (const m of (value.messages as Array<Record<string, unknown>> | undefined) ?? []) {
        const id = typeof m.id === 'string' ? m.id : '';
        const from = typeof m.from === 'string' ? m.from.replace(/\D/g, '') : '';
        if (!id || !from) continue;
        const type = typeof m.type === 'string' ? m.type : 'text';
        let text = '';
        let mediaId: string | null = null;
        if (type === 'text') text = String((m.text as { body?: string } | undefined)?.body ?? '');
        else if (type === 'interactive') {
          const i = m.interactive as { button_reply?: { title?: string }; list_reply?: { title?: string } } | undefined;
          text = i?.button_reply?.title ?? i?.list_reply?.title ?? '';
        } else if (type === 'button') text = String((m.button as { text?: string } | undefined)?.text ?? '');
        else {
          const media = m[type] as { id?: string; caption?: string } | undefined;
          mediaId = media?.id ?? null;
          text = [TYPE_PLACEHOLDER[type] ?? `[${type}]`, media?.caption].filter(Boolean).join(' ');
        }
        // ردود التفاعل (reaction) لا تُعرض كرسالة
        if (type === 'reaction') continue;
        messages.push({
          phoneNumberId,
          from,
          profileName: nameByWaId.get(from) ?? nameByWaId.get(m.from as string) ?? null,
          id,
          timestamp: new Date((Number(m.timestamp) || Date.now() / 1000) * 1000),
          type,
          text: text.slice(0, 4000),
          mediaId,
        });
      }

      for (const s of (value.statuses as Array<Record<string, unknown>> | undefined) ?? []) {
        const id = typeof s.id === 'string' ? s.id : '';
        const status = s.status;
        if (!id || (status !== 'sent' && status !== 'delivered' && status !== 'read' && status !== 'failed')) continue;
        const err = (s.errors as Array<{ code?: number; title?: string; message?: string }> | undefined)?.[0];
        statuses.push({
          phoneNumberId,
          id,
          status,
          timestamp: new Date((Number(s.timestamp) || Date.now() / 1000) * 1000),
          error: err ? `${err.code ?? ''} ${err.title ?? err.message ?? ''}`.trim() : null,
        });
      }
    }
  }
  return { messages, statuses };
}

// ترتيب الحالات: لا نرجع من "قُرئ" إلى "وصل" إن وصلت الأحداث مبعثرة
const RANK: Record<string, number> = { sent: 1, delivered: 2, read: 3, failed: 0 };
export function shouldAdvanceStatus(current: string | null | undefined, next: string): boolean {
  if (next === 'failed') return current !== 'read' && current !== 'delivered';
  return (RANK[next] ?? 0) > (RANK[current ?? ''] ?? 0);
}

// تشفير رمز الوصول لكل صالون (AES-256-GCM). المفتاح 32 بايت base64 في WHATSAPP_TOKEN_ENC_KEY.
function key(): Buffer {
  const raw = process.env.WHATSAPP_TOKEN_ENC_KEY;
  const k = raw ? Buffer.from(raw, 'base64') : Buffer.alloc(0);
  if (k.length !== 32) throw new Error('WHATSAPP_TOKEN_ENC_KEY must be 32 bytes (base64)');
  return k;
}
export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return `v1:${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${enc.toString('base64')}`;
}
export function decryptToken(blob: string): string {
  const [v, iv, tag, data] = blob.split(':');
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('bad token blob');
  const d = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
}

// أرقام واتساب بصيغة دولية بلا + (مثل 97333123456)
export function normalizeWaPhone(input: string): string {
  return input.replace(/\D/g, '');
}

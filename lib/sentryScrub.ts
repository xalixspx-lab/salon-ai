import type { ErrorEvent } from '@sentry/nextjs';

// تنقية بيانات شخصية من أحداث Sentry قبل خروجها من المنصة (PRD §6: عدم تسرب بيانات
// العملاء في السجلات). لا نرسل الكوكيز ولا الترويسات الحساسة ولا أجسام الطلبات،
// ونستبدل البريد ورقم الجوال داخل أي نص بقيم مقنّعة.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /\+?\d[\d\s().-]{6,}\d/g;

const mask = (s: string) => s.replace(EMAIL, '[email]').replace(PHONE, '[phone]');

function scrubValue(v: unknown, depth = 0): unknown {
  if (typeof v === 'string') return mask(v);
  if (depth > 6 || v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => scrubValue(x, depth + 1));
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, scrubValue(x, depth + 1)]));
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      for (const h of Object.keys(event.request.headers)) {
        if (/^(cookie|authorization|x-forwarded-for|x-real-ip)$/i.test(h)) delete event.request.headers[h];
      }
    }
  }
  delete event.user;
  if (event.message) event.message = mask(event.message);
  return scrubValue(event) as ErrorEvent;
}

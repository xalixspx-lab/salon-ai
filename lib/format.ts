import { DEFAULT_TIMEZONE } from '@/lib/schedule';

// عرض موعد بتوقيت الصالون (لا توقيت خادم Vercel UTC فيتأخر 3 ساعات عن البحرين)
// وبالتقويم الميلادي: ar-SA يفترض التقويم الهجري فتظهر مواعيد الحجز بتواريخ مختلفة
function intlLocale(locale: string) {
  return locale === 'en' ? 'en-GB' : 'ar-BH';
}

export function formatDateTime(at: Date | string, locale: string, timeZone?: string | null) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: timeZone || DEFAULT_TIMEZONE,
    calendar: 'gregory',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(at));
}

export function formatDate(at: Date | string, locale: string, timeZone?: string | null) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: timeZone || DEFAULT_TIMEZONE,
    calendar: 'gregory',
    dateStyle: 'medium',
  }).format(new Date(at));
}

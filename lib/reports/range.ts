import { localParts, zonedToUtc } from '@/lib/schedule';
import type { Frequency, Lang } from '@/lib/reports/types';

// نطاقات التقارير بتوقيت الصالون: كل نطاق [from, to) بلحظات UTC تطابق حدود أيام محلية.
export const PRESETS = ['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth', 'custom'] as const;
export type Preset = (typeof PRESETS)[number];

export const MAX_SPAN_DAYS = 366;
const DAY = 86400000;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const firstOfMonth = (ymd: string) => ymd.slice(0, 8) + '01';
function addMonths(ymd: string, n: number): string {
  const [y, m] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
}
const validYmd = (s: string) => YMD.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;

export type Range = { from: Date; to: Date; fromYmd: string; toYmdInclusive: string; label: string };

// يرجع Range أو {error}. to حصري داخليًا، لكن المستخدم يرسل آخر يوم شاملًا (custom).
export function resolveRange(
  input: { preset?: string | null; from?: string | null; to?: string | null },
  tz: string,
  lang: Lang = 'ar',
  now: Date = new Date()
): Range | { error: string } {
  const today = localParts(now, tz).dateStr;
  let fromYmd: string;
  let toExclusive: string; // يوم محلي حصري

  switch (input.preset ?? 'last30') {
    case 'today':
      fromYmd = today;
      toExclusive = addDays(today, 1);
      break;
    case 'yesterday':
      fromYmd = addDays(today, -1);
      toExclusive = today;
      break;
    case 'last7':
      fromYmd = addDays(today, -6);
      toExclusive = addDays(today, 1);
      break;
    case 'last30':
      fromYmd = addDays(today, -29);
      toExclusive = addDays(today, 1);
      break;
    case 'thisMonth':
      fromYmd = firstOfMonth(today);
      toExclusive = addDays(today, 1);
      break;
    case 'lastMonth':
      fromYmd = addMonths(firstOfMonth(today), -1);
      toExclusive = firstOfMonth(today);
      break;
    case 'custom': {
      if (!input.from || !input.to || !validYmd(input.from) || !validYmd(input.to)) {
        return { error: lang === 'en' ? 'Invalid dates' : 'تواريخ غير صالحة' };
      }
      if (input.from > input.to) return { error: lang === 'en' ? 'Start date is after end date' : 'تاريخ البداية بعد النهاية' };
      fromYmd = input.from;
      toExclusive = addDays(input.to, 1);
      break;
    }
    default:
      return { error: lang === 'en' ? 'Unknown period' : 'فترة غير معروفة' };
  }

  const span = (Date.parse(toExclusive + 'T00:00:00Z') - Date.parse(fromYmd + 'T00:00:00Z')) / DAY;
  if (span > MAX_SPAN_DAYS) return { error: lang === 'en' ? 'Period is longer than 366 days' : 'الفترة أطول من 366 يومًا' };

  const toIncl = addDays(toExclusive, -1);
  return {
    from: zonedToUtc(fromYmd, '00:00', tz),
    to: zonedToUtc(toExclusive, '00:00', tz),
    fromYmd,
    toYmdInclusive: toIncl,
    label: fromYmd === toIncl ? fromYmd : `${fromYmd} → ${toIncl}`,
  };
}

// الفترة التي يغطيها التقرير الدوري عند تشغيله اليوم
export function periodForSchedule(frequency: Frequency, tz: string, lang: Lang, now: Date = new Date()): Range {
  const preset = frequency === 'DAILY' ? 'yesterday' : frequency === 'WEEKLY' ? 'last7' : 'lastMonth';
  const today = localParts(now, tz).dateStr;
  // الأسبوعي: آخر 7 أيام كاملة تنتهي بالأمس (لا تشمل اليوم الجاري)
  if (frequency === 'WEEKLY') {
    const r = resolveRange({ preset: 'custom', from: addDays(today, -7), to: addDays(today, -1) }, tz, lang, now);
    if ('error' in r) throw new Error(r.error);
    return r;
  }
  const r = resolveRange({ preset }, tz, lang, now);
  if ('error' in r) throw new Error(r.error);
  return r;
}

export type ScheduleLike = { frequency: string; dayOfWeek: number | null; dayOfMonth: number | null; lastRunAt: Date | null };

// هل حان تشغيل هذا الجدول اليوم (بتوقيت tz)؟ يمنع التشغيل مرتين في اليوم نفسه.
export function isScheduleDue(s: ScheduleLike, tz: string, now: Date = new Date()): boolean {
  const today = localParts(now, tz);
  if (s.lastRunAt && localParts(s.lastRunAt, tz).dateStr === today.dateStr) return false;
  if (s.frequency === 'DAILY') return true;
  if (s.frequency === 'WEEKLY') return s.dayOfWeek === today.weekday;
  if (s.frequency === 'MONTHLY') return s.dayOfMonth === Number(today.dateStr.slice(8, 10));
  return false;
}

import type { Cell, ColKind, Lang, Report } from '@/lib/reports/types';

// تنسيق خلايا التقرير للعرض (شاشة/بريد). نقي وآمن للمتصفح: لا قاعدة بيانات ولا شبكة.
type Ctx = { lang: Lang; tz: string; currency: string };

const NUM_LOCALE = 'en-US'; // أرقام لاتينية في التقارير (أوضح في الجداول والتصدير)

export function formatCell(value: Cell, kind: ColKind | undefined, ctx: Ctx): string {
  if (value === null || value === undefined || value === '') return '—';
  switch (kind) {
    case 'int':
      return typeof value === 'number' ? new Intl.NumberFormat(NUM_LOCALE).format(value) : String(value);
    case 'money':
      return typeof value === 'number'
        ? `${new Intl.NumberFormat(NUM_LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(value)} ${ctx.currency}`
        : String(value);
    case 'percent':
      return typeof value === 'number' ? `${new Intl.NumberFormat(NUM_LOCALE, { maximumFractionDigits: 1 }).format(value)}%` : String(value);
    case 'minutes':
      return typeof value === 'number'
        ? value >= 90
          ? `${(value / 60).toFixed(1)} ${ctx.lang === 'en' ? 'h' : 'س'}`
          : `${Math.round(value)} ${ctx.lang === 'en' ? 'min' : 'د'}`
        : String(value);
    case 'date':
      return new Intl.DateTimeFormat('sv-SE', { timeZone: ctx.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(String(value)));
    case 'datetime':
      return new Intl.DateTimeFormat('sv-SE', {
        timeZone: ctx.tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(String(value)));
    default:
      return String(value);
  }
}

export const ctxOf = (r: Pick<Report, 'lang' | 'tz' | 'currency'>): Ctx => ({ lang: r.lang, tz: r.tz, currency: r.currency });

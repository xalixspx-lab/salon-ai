import { describe, expect, it } from 'vitest';
import { isScheduleDue, periodForSchedule, resolveRange } from '@/lib/reports/range';
import { reportToCsv, sanitizeCsvText } from '@/lib/reports/csv';
import { formatCell } from '@/lib/reports/format';
import type { Report } from '@/lib/reports/types';

const TZ = 'Asia/Bahrain'; // UTC+3 بلا توقيت صيفي
// الخميس 2026-10-08 12:00 بتوقيت البحرين
const NOW = new Date('2026-10-08T09:00:00Z');

describe('resolveRange', () => {
  it('today / yesterday use local day boundaries (UTC+3)', () => {
    const t = resolveRange({ preset: 'today' }, TZ, 'ar', NOW) as Exclude<ReturnType<typeof resolveRange>, { error: string }>;
    expect(t.from.toISOString()).toBe('2026-10-07T21:00:00.000Z');
    expect(t.to.toISOString()).toBe('2026-10-08T21:00:00.000Z');
    const y = resolveRange({ preset: 'yesterday' }, TZ, 'ar', NOW) as typeof t;
    expect(y.fromYmd).toBe('2026-10-07');
    expect(y.to.toISOString()).toBe(t.from.toISOString());
  });

  it('last7 spans 7 local days including today; last30 spans 30', () => {
    const r7 = resolveRange({ preset: 'last7' }, TZ, 'ar', NOW) as { fromYmd: string; toYmdInclusive: string };
    expect([r7.fromYmd, r7.toYmdInclusive]).toEqual(['2026-10-02', '2026-10-08']);
    const r30 = resolveRange({ preset: 'last30' }, TZ, 'ar', NOW) as { fromYmd: string };
    expect(r30.fromYmd).toBe('2026-09-09');
  });

  it('thisMonth and lastMonth', () => {
    const tm = resolveRange({ preset: 'thisMonth' }, TZ, 'ar', NOW) as { fromYmd: string; toYmdInclusive: string };
    expect([tm.fromYmd, tm.toYmdInclusive]).toEqual(['2026-10-01', '2026-10-08']);
    const lm = resolveRange({ preset: 'lastMonth' }, TZ, 'ar', NOW) as { fromYmd: string; toYmdInclusive: string };
    expect([lm.fromYmd, lm.toYmdInclusive]).toEqual(['2026-09-01', '2026-09-30']);
  });

  it('lastMonth crosses the year boundary', () => {
    const r = resolveRange({ preset: 'lastMonth' }, TZ, 'ar', new Date('2027-01-05T10:00:00Z')) as { fromYmd: string; toYmdInclusive: string };
    expect([r.fromYmd, r.toYmdInclusive]).toEqual(['2026-12-01', '2026-12-31']);
  });

  it('custom range is inclusive of the end day', () => {
    const r = resolveRange({ preset: 'custom', from: '2026-10-01', to: '2026-10-03' }, TZ, 'ar', NOW) as { from: Date; to: Date };
    expect((r.to.getTime() - r.from.getTime()) / 86400000).toBe(3);
  });

  it('rejects bad input', () => {
    expect(resolveRange({ preset: 'custom', from: '2026-10-05', to: '2026-10-01' }, TZ, 'en', NOW)).toHaveProperty('error');
    expect(resolveRange({ preset: 'custom', from: 'x', to: '2026-10-01' }, TZ, 'en', NOW)).toHaveProperty('error');
    expect(resolveRange({ preset: 'custom', from: '2026-02-31', to: '2026-03-02' }, TZ, 'en', NOW)).toHaveProperty('error');
    expect(resolveRange({ preset: 'custom', from: '2024-01-01', to: '2026-01-01' }, TZ, 'en', NOW)).toHaveProperty('error');
    expect(resolveRange({ preset: 'forever' }, TZ, 'en', NOW)).toHaveProperty('error');
  });
});

describe('scheduled periods and due-ness', () => {
  it('daily covers yesterday, weekly the last 7 full days, monthly the previous month', () => {
    expect(periodForSchedule('DAILY', TZ, 'ar', NOW).fromYmd).toBe('2026-10-07');
    const w = periodForSchedule('WEEKLY', TZ, 'ar', NOW);
    expect([w.fromYmd, w.toYmdInclusive]).toEqual(['2026-10-01', '2026-10-07']);
    const m = periodForSchedule('MONTHLY', TZ, 'ar', NOW);
    expect([m.fromYmd, m.toYmdInclusive]).toEqual(['2026-09-01', '2026-09-30']);
  });

  it('daily is due once per local day', () => {
    const s = { frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, lastRunAt: null as Date | null };
    expect(isScheduleDue(s, TZ, NOW)).toBe(true);
    expect(isScheduleDue({ ...s, lastRunAt: new Date('2026-10-08T01:00:00Z') }, TZ, NOW)).toBe(false); // نفس اليوم المحلي
    expect(isScheduleDue({ ...s, lastRunAt: new Date('2026-10-07T01:00:00Z') }, TZ, NOW)).toBe(true);
  });

  it('weekly fires only on its weekday (0 = Sunday); 2026-10-08 is a Thursday', () => {
    const base = { frequency: 'WEEKLY', dayOfMonth: null, lastRunAt: null };
    expect(isScheduleDue({ ...base, dayOfWeek: 4 }, TZ, NOW)).toBe(true);
    expect(isScheduleDue({ ...base, dayOfWeek: 0 }, TZ, NOW)).toBe(false);
  });

  it('monthly fires only on its day of month', () => {
    const base = { frequency: 'MONTHLY', dayOfWeek: null, lastRunAt: null };
    expect(isScheduleDue({ ...base, dayOfMonth: 8 }, TZ, NOW)).toBe(true);
    expect(isScheduleDue({ ...base, dayOfMonth: 1 }, TZ, NOW)).toBe(false);
  });

  it('uses the salon timezone, not UTC, to decide the local day', () => {
    // 22:00 UTC على 7 أكتوبر = 01:00 يوم 8 أكتوبر في البحرين
    const late = new Date('2026-10-07T22:00:00Z');
    expect(isScheduleDue({ frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: 8, lastRunAt: null }, TZ, late)).toBe(true);
  });
});

describe('CSV export', () => {
  const report: Report = {
    type: 'bookings',
    scope: 'OWNER',
    title: 'تقرير الحجوزات',
    lang: 'ar',
    tz: TZ,
    currency: 'BHD',
    period: { from: '', to: '', label: '2026-10-01 → 2026-10-07' },
    generatedAt: NOW.toISOString(),
    kpis: [{ id: 'n', label: 'عدد', value: 2, kind: 'int' }],
    sections: [
      {
        id: 'list',
        title: 'القائمة',
        columns: [
          { key: 'name', label: 'العميل' },
          { key: 'amount', label: 'المبلغ', kind: 'money' },
          { key: 'at', label: 'الوقت', kind: 'datetime' },
        ],
        rows: [
          { name: '=HYPERLINK("http://evil","x")', amount: 4.5, at: '2026-10-07T09:30:00Z' },
          { name: 'اسم, بفاصلة "واقتباس"', amount: 10, at: null },
        ],
      },
    ],
  };

  it('starts with a UTF-8 BOM and uses CRLF', () => {
    const csv = reportToCsv(report);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('\r\n');
  });

  it('neutralises spreadsheet formulas in user-controlled text', () => {
    const csv = reportToCsv(report);
    expect(csv).toContain(`'=HYPERLINK`);
    expect(csv).not.toMatch(/(^|,)=HYPERLINK/m);
    expect(sanitizeCsvText('+1')).toBe("'+1");
    expect(sanitizeCsvText('-2')).toBe("'-2");
    expect(sanitizeCsvText('@x')).toBe("'@x");
    expect(sanitizeCsvText('عادي')).toBe('عادي');
  });

  it('quotes commas/quotes, prints money with 3 decimals and local datetimes', () => {
    const csv = reportToCsv(report);
    expect(csv).toContain('"اسم, بفاصلة ""واقتباس"""');
    expect(csv).toContain('4.500');
    expect(csv).toContain('2026-10-07 12:30'); // 09:30Z = 12:30 البحرين
  });
});

describe('formatCell', () => {
  const ctx = { lang: 'ar' as const, tz: TZ, currency: 'BHD' };
  it('formats kinds', () => {
    expect(formatCell(1234, 'int', ctx)).toBe('1,234');
    expect(formatCell(4.5, 'money', ctx)).toBe('4.5 BHD');
    expect(formatCell(12.34, 'percent', ctx)).toBe('12.3%');
    expect(formatCell(45, 'minutes', ctx)).toBe('45 د');
    expect(formatCell(120, 'minutes', { ...ctx, lang: 'en' })).toBe('2.0 h');
    expect(formatCell(null, 'int', ctx)).toBe('—');
  });
});

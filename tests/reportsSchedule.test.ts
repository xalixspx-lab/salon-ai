import { describe, expect, it } from 'vitest';
import { parseScheduleInput } from '@/lib/reports/schedule';
import { renderReportEmail } from '@/lib/reports/email';
import type { Report } from '@/lib/reports/types';

const anyType = () => true;
const noType = () => false;

describe('parseScheduleInput', () => {
  it('accepts daily without day fields', () => {
    expect(parseScheduleInput({ reportType: 'overview', frequency: 'DAILY' }, anyType)).toEqual({
      reportType: 'overview', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, locale: 'ar',
    });
  });

  it('weekly needs dayOfWeek 0..6', () => {
    expect('error' in parseScheduleInput({ reportType: 'x', frequency: 'WEEKLY' }, anyType)).toBe(true);
    expect('error' in parseScheduleInput({ reportType: 'x', frequency: 'WEEKLY', dayOfWeek: 7 }, anyType)).toBe(true);
    expect('error' in parseScheduleInput({ reportType: 'x', frequency: 'WEEKLY', dayOfWeek: 1.5 }, anyType)).toBe(true);
    const ok = parseScheduleInput({ reportType: 'x', frequency: 'WEEKLY', dayOfWeek: 0, locale: 'en' }, anyType);
    expect(ok).toMatchObject({ dayOfWeek: 0, dayOfMonth: null, locale: 'en' });
  });

  it('monthly needs dayOfMonth 1..28 (so it exists in every month)', () => {
    expect('error' in parseScheduleInput({ reportType: 'x', frequency: 'MONTHLY', dayOfMonth: 29 }, anyType)).toBe(true);
    expect('error' in parseScheduleInput({ reportType: 'x', frequency: 'MONTHLY', dayOfMonth: 0 }, anyType)).toBe(true);
    expect(parseScheduleInput({ reportType: 'x', frequency: 'MONTHLY', dayOfMonth: 28 }, anyType)).toMatchObject({ dayOfMonth: 28 });
  });

  it('rejects unknown frequency, unknown type and ignores unknown locale', () => {
    expect('error' in parseScheduleInput({ reportType: 'x', frequency: 'HOURLY' }, anyType)).toBe(true);
    expect('error' in parseScheduleInput({ reportType: 'x', frequency: 'DAILY' }, noType)).toBe(true);
    expect(parseScheduleInput({ reportType: 'x', frequency: 'DAILY', locale: 'fr' }, anyType)).toMatchObject({ locale: 'ar' });
  });
});

const EVIL = '<img src=x onerror=alert(1)>';
const report: Report = {
  type: 'overview',
  scope: 'OWNER',
  title: 'Overview',
  lang: 'en',
  tz: 'Asia/Bahrain',
  currency: 'BHD',
  period: { from: '2026-10-01T00:00:00.000Z', to: '2026-10-08T00:00:00.000Z', label: '2026-10-01 → 2026-10-07' },
  generatedAt: '2026-10-08T04:00:00.000Z',
  kpis: [{ id: 'k', label: `Revenue ${EVIL}`, value: 12.5, kind: 'money' }],
  sections: [
    {
      id: 's',
      title: `Top ${EVIL}`,
      columns: [{ key: 'name', label: 'Name' }],
      rows: [{ name: EVIL }, { name: '=HYPERLINK("http://evil")' }],
    },
  ],
};

describe('renderReportEmail', () => {
  const mail = renderReportEmail(report, { link: 'https://salon-ai.co/en/dashboard/reports' });

  it('escapes user-controlled text in the HTML body', () => {
    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('&lt;img');
  });

  it('attaches a CSV with BOM and formula-sanitised cells', () => {
    expect(mail.attachments).toHaveLength(1);
    const a = mail.attachments[0];
    expect(a.filename.endsWith('.csv')).toBe(true);
    expect(a.content.charCodeAt(0)).toBe(0xfeff);
    expect(a.content).toContain("'=HYPERLINK");
  });

  it('includes subject and the link', () => {
    expect(mail.subject).toContain('Overview');
    expect(mail.html).toContain('https://salon-ai.co/en/dashboard/reports');
  });
});

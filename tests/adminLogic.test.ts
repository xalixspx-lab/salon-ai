import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from '@/lib/csv';
import { DEFAULT_SETTINGS, normalizeSettings } from '@/lib/platformSettings';
import { generateTempPassword } from '@/lib/tempPassword';

describe('csv', () => {
  it('neutralizes spreadsheet formula injection', () => {
    for (const evil of ['=1+1', '+cmd', '-2+3', '@SUM(A1)']) expect(csvCell(evil).startsWith("'")).toBe(true);
  });

  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('renders null, booleans and dates', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(true)).toBe('true');
    expect(csvCell(new Date('2026-01-02T03:04:05Z'))).toBe('2026-01-02T03:04:05.000Z');
  });

  it('starts with a BOM so Excel reads Arabic', () => {
    expect(toCsv(['a'], [['x']]).charCodeAt(0)).toBe(0xfeff);
  });
});

describe('normalizeSettings', () => {
  it('returns defaults for missing or garbage input', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('x')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ prices: 5, announcement: [] })).toEqual(DEFAULT_SETTINGS);
  });

  it('accepts valid values and clamps invalid ones back to defaults', () => {
    const s = normalizeSettings({ trialDays: 30, prices: { BASIC: 12.5, PROFESSIONAL: -3, ENTERPRISE: 'abc' } });
    expect(s.trialDays).toBe(30);
    expect(s.prices.BASIC).toBe(12.5);
    expect(s.prices.PROFESSIONAL).toBe(DEFAULT_SETTINGS.prices.PROFESSIONAL);
    expect(s.prices.ENTERPRISE).toBe(DEFAULT_SETTINGS.prices.ENTERPRISE);
  });

  it('rejects an absurd trial length', () => {
    expect(normalizeSettings({ trialDays: 100000 }).trialDays).toBe(DEFAULT_SETTINGS.trialDays);
  });

  it('only treats announcement.active === true as active and caps text length', () => {
    expect(normalizeSettings({ announcement: { active: 'yes' } }).announcement.active).toBe(false);
    expect(normalizeSettings({ announcement: { textAr: 'x'.repeat(900) } }).announcement.textAr).toHaveLength(500);
  });
});

describe('generateTempPassword', () => {
  it('is long enough, unique, and avoids look-alike characters', () => {
    const a = generateTempPassword();
    expect(a).toHaveLength(14);
    expect(a).not.toMatch(/[0OIl1]/);
    expect(generateTempPassword()).not.toBe(a);
  });
});

describe('normalizeSettings automations', () => {
  it('defaults every automatic job to ON (also for legacy settings without the field)', () => {
    expect(normalizeSettings({}).automations).toEqual({ reports: true, reminders: true, reviews: true, winBack: true });
    expect(normalizeSettings({ trialDays: 7 }).automations.reports).toBe(true);
  });
  it('only an explicit false turns a job off; junk values stay ON', () => {
    const a = normalizeSettings({ automations: { reports: false, reminders: 0, reviews: 'no', winBack: false } }).automations;
    expect(a).toEqual({ reports: false, reminders: true, reviews: true, winBack: false });
  });
});

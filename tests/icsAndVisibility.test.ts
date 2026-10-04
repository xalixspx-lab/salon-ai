import { describe, expect, it } from 'vitest';
import { buildIcs } from '@/lib/ics';
import { isPubliclyVisible, PUBLIC_TENANT } from '@/lib/visibility';

describe('buildIcs', () => {
  const base = {
    uid: 'abc',
    start: new Date('2026-10-05T09:30:00Z'),
    end: new Date('2026-10-05T10:30:00Z'),
    summary: 'قص شعر — صالون, الورد; "VIP"',
  };

  it('emits a valid VCALENDAR with UTC times and CRLF line endings', () => {
    const ics = buildIcs(base);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261005T093000Z');
    expect(ics).toContain('DTEND:20261005T103000Z');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it('escapes commas, semicolons and newlines in text fields', () => {
    const ics = buildIcs({ ...base, description: 'a,b;c\nd' });
    expect(ics).toContain('DESCRIPTION:a\\,b\\;c\\nd');
  });

  it('folds lines longer than 75 bytes', () => {
    const ics = buildIcs({ ...base, summary: 'x'.repeat(200) });
    for (const line of ics.split('\r\n')) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });
});

describe('public visibility', () => {
  it('hides salons hidden by the admin even when the owner published them', () => {
    expect(isPubliclyVisible({ isPublished: true, adminHiddenAt: new Date() })).toBe(false);
    expect(isPubliclyVisible({ isPublished: false, adminHiddenAt: null })).toBe(false);
    expect(isPubliclyVisible({ isPublished: true, adminHiddenAt: null })).toBe(true);
  });

  it('exposes the matching Prisma filter', () => {
    expect(PUBLIC_TENANT).toEqual({ isPublished: true, adminHiddenAt: null });
  });
});

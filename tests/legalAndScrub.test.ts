import { describe, expect, it } from 'vitest';
import type { ErrorEvent } from '@sentry/nextjs';
import { scrubSentryEvent } from '@/lib/sentryScrub';
import { LEGAL_AUDIENCE, LEGAL_DOCS, LEGAL_SLUGS } from '@/lib/legalContent';

describe('legal documents', () => {
  it('every document exists in both languages with non-empty sections', () => {
    for (const slug of LEGAL_SLUGS) {
      for (const lang of ['ar', 'en'] as const) {
        const d = LEGAL_DOCS[slug][lang];
        expect(d.title.length).toBeGreaterThan(3);
        expect(d.sections.length).toBeGreaterThan(3);
        for (const s of d.sections) {
          expect(s.heading).toBeTruthy();
          expect(s.paragraphs.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('ar and en versions have the same section structure', () => {
    for (const slug of LEGAL_SLUGS) {
      const ar = LEGAL_DOCS[slug].ar.sections.map((s) => s.heading.split(' ')[0]);
      const en = LEGAL_DOCS[slug].en.sections.map((s) => s.heading.split(' ')[0]);
      expect(ar).toEqual(en);
    }
  });

  it('every document declares who it applies to, covering both audiences overall', () => {
    expect(Object.keys(LEGAL_AUDIENCE).sort()).toEqual([...LEGAL_SLUGS].sort());
    const values = Object.values(LEGAL_AUDIENCE);
    expect(values).toContain('customer');
    expect(values).toContain('owner');
  });
});

describe('sentry scrubbing', () => {
  it('removes cookies, request bodies, users and masks emails/phones', () => {
    const event = {
      message: 'failed for sara@example.com phone +973 3600 1234',
      user: { email: 'sara@example.com' },
      request: {
        cookies: { salon_session: 'secret' },
        data: { password: 'x' },
        headers: { cookie: 'a=b', 'user-agent': 'ua', authorization: 'Bearer t' },
      },
      extra: { note: 'contact 33445566 or a@b.co' },
    } as unknown as ErrorEvent;
    const out = scrubSentryEvent(event) as unknown as Record<string, any>;
    expect(out.user).toBeUndefined();
    expect(out.request.cookies).toBeUndefined();
    expect(out.request.data).toBeUndefined();
    expect(out.request.headers.cookie).toBeUndefined();
    expect(out.request.headers.authorization).toBeUndefined();
    expect(out.request.headers['user-agent']).toBe('ua');
    expect(out.message).toBe('failed for [email] phone [phone]');
    expect(out.extra.note).toBe('contact [phone] or [email]');
  });
});

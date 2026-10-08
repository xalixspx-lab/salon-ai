import crypto from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  decryptToken,
  encryptToken,
  isReplyWindowOpen,
  parseWebhook,
  shouldAdvanceStatus,
  verifySignature,
} from '@/lib/whatsappCore';

const sign = (body: string, secret: string) => 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

describe('verifySignature', () => {
  const body = JSON.stringify({ hello: 'عالم' });
  it('accepts a correct signature', () => {
    expect(verifySignature(body, sign(body, 's3cret'), 's3cret')).toBe(true);
  });
  it('rejects wrong secret, tampered body, missing/garbage header', () => {
    expect(verifySignature(body, sign(body, 'other'), 's3cret')).toBe(false);
    expect(verifySignature(body + ' ', sign(body, 's3cret'), 's3cret')).toBe(false);
    expect(verifySignature(body, null, 's3cret')).toBe(false);
    expect(verifySignature(body, 'sha256=zz', 's3cret')).toBe(false);
    expect(verifySignature(body, 'md5=abc', 's3cret')).toBe(false);
    expect(verifySignature(body, sign(body, 's3cret'), '')).toBe(false);
  });
});

describe('parseWebhook', () => {
  const wrap = (value: unknown) => ({ entry: [{ changes: [{ value }] }] });
  const meta = { phone_number_id: 'PNID1' };

  it('parses a text message with the profile name', () => {
    const r = parseWebhook(
      wrap({
        metadata: meta,
        contacts: [{ wa_id: '97333123456', profile: { name: 'نورة' } }],
        messages: [{ id: 'wamid.A', from: '97333123456', timestamp: '1790000000', type: 'text', text: { body: 'مرحبا' } }],
      })
    );
    expect(r.messages).toHaveLength(1);
    expect(r.messages[0]).toMatchObject({ phoneNumberId: 'PNID1', from: '97333123456', profileName: 'نورة', id: 'wamid.A', type: 'text', text: 'مرحبا', mediaId: null });
    expect(r.messages[0].timestamp.getTime()).toBe(1790000000 * 1000);
  });

  it('uses a placeholder for audio/image and keeps the media id', () => {
    const r = parseWebhook(
      wrap({ metadata: meta, messages: [{ id: 'wamid.B', from: '97333111222', timestamp: '1', type: 'audio', audio: { id: 'MEDIA9' } }] })
    );
    expect(r.messages[0].text).toContain('صوتية');
    expect(r.messages[0].mediaId).toBe('MEDIA9');
  });

  it('reads interactive button replies and ignores reactions', () => {
    const r = parseWebhook(
      wrap({
        metadata: meta,
        messages: [
          { id: 'wamid.C', from: '1', timestamp: '1', type: 'interactive', interactive: { button_reply: { title: 'تأكيد' } } },
          { id: 'wamid.D', from: '1', timestamp: '1', type: 'reaction', reaction: { emoji: '👍' } },
        ],
      })
    );
    expect(r.messages.map((m) => m.text)).toEqual(['تأكيد']);
  });

  it('parses delivery statuses including failures', () => {
    const r = parseWebhook(
      wrap({
        metadata: meta,
        statuses: [
          { id: 'wamid.X', status: 'delivered', timestamp: '5' },
          { id: 'wamid.Y', status: 'failed', timestamp: '6', errors: [{ code: 131047, title: 'Re-engagement message' }] },
          { id: 'wamid.Z', status: 'weird', timestamp: '7' },
        ],
      })
    );
    expect(r.statuses.map((s) => s.status)).toEqual(['delivered', 'failed']);
    expect(r.statuses[1].error).toContain('131047');
  });

  it('is safe on malformed payloads', () => {
    for (const p of [null, undefined, {}, { entry: 'x' }, { entry: [{}] }, { entry: [{ changes: [{ value: {} }] }] }, 42]) {
      expect(parseWebhook(p)).toEqual({ messages: [], statuses: [] });
    }
  });
});

describe('reply window and status ordering', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  it('is open within 24h and closed after', () => {
    expect(isReplyWindowOpen(new Date(now - 23 * 3600e3), now)).toBe(true);
    expect(isReplyWindowOpen(new Date(now - 25 * 3600e3), now)).toBe(false);
    expect(isReplyWindowOpen(null, now)).toBe(false);
  });
  it('never moves a status backwards', () => {
    expect(shouldAdvanceStatus('sent', 'delivered')).toBe(true);
    expect(shouldAdvanceStatus('delivered', 'read')).toBe(true);
    expect(shouldAdvanceStatus('read', 'delivered')).toBe(false);
    expect(shouldAdvanceStatus('delivered', 'sent')).toBe(false);
    expect(shouldAdvanceStatus('read', 'failed')).toBe(false);
    expect(shouldAdvanceStatus('sent', 'failed')).toBe(true);
    expect(shouldAdvanceStatus(null, 'sent')).toBe(true);
  });
});

describe('token encryption', () => {
  beforeAll(() => {
    process.env.WHATSAPP_TOKEN_ENC_KEY = crypto.randomBytes(32).toString('base64');
  });
  it('round-trips and uses a fresh IV each time', () => {
    const a = encryptToken('EAAG-secret-token');
    const b = encryptToken('EAAG-secret-token');
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe('EAAG-secret-token');
    expect(a).not.toContain('EAAG');
  });
  it('detects tampering', () => {
    const blob = encryptToken('abc');
    const parts = blob.split(':');
    parts[3] = Buffer.from('xxx').toString('base64');
    expect(() => decryptToken(parts.join(':'))).toThrow();
  });
  it('rejects a missing or short key', () => {
    process.env.WHATSAPP_TOKEN_ENC_KEY = 'short';
    expect(() => encryptToken('x')).toThrow();
  });
});

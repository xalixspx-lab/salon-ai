import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rateLimit } from '@/lib/rateLimit';

// بدون REDIS_URL في بيئة الاختبار، يعمل rateLimit عبر الاحتياطي داخل الذاكرة —
// وهذا مقصود: نريد اختبارات حتمية لا تعتمد على شبكة Redis حقيقية.
describe('rateLimit (in-memory fallback)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('allows up to the limit then blocks', async () => {
    const key = `t1:${Math.random()}`;
    const results = [];
    for (let i = 0; i < 5; i++) results.push((await rateLimit(key, 3, 60_000)).ok);
    expect(results).toEqual([true, true, true, false, false]);
  });

  it('reports a retry-after in seconds when blocked', async () => {
    const key = `t2:${Math.random()}`;
    await rateLimit(key, 1, 60_000);
    const blocked = await rateLimit(key, 1, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it('resets after the window passes', async () => {
    const key = `t3:${Math.random()}`;
    await rateLimit(key, 1, 1_000);
    expect((await rateLimit(key, 1, 1_000)).ok).toBe(false);
    vi.advanceTimersByTime(1_001);
    expect((await rateLimit(key, 1, 1_000)).ok).toBe(true);
  });

  it('keeps separate keys independent', async () => {
    const a = `t4a:${Math.random()}`;
    const b = `t4b:${Math.random()}`;
    await rateLimit(a, 1, 60_000);
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(false);
    expect((await rateLimit(b, 1, 60_000)).ok).toBe(true);
  });
});

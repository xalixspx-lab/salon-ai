import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

// نافذة ثابتة (fixed window). على Redis عبر INCR+PEXPIRE تعمل بشكل صحيح مهما
// تعدّدت نسخ السيرفر (فيرسل)؛ بدون Redis (تطوير محلي أو تعذّر الاتصال) نستخدم
// ذاكرة العملية كحل احتياطي فقط — يعمل لكل نسخة سيرفر على حدة.
type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as unknown as { __rateBuckets?: Map<string, Bucket> };
const memBuckets = (globalStore.__rateBuckets ??= new Map<string, Bucket>());

function memoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (memBuckets.size > 5000) {
    for (const [k, b] of memBuckets) if (b.resetAt <= now) memBuckets.delete(k);
  }
  const bucket = memBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    memBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, retryAfterSec: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false as const, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true as const, retryAfterSec: 0 };
}

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const redis = await getRedis();
  if (!redis) return memoryRateLimit(key, limit, windowMs);

  try {
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.pExpire(redisKey, windowMs);
    }
    if (count > limit) {
      const ttl = await redis.pTTL(redisKey);
      return { ok: false as const, retryAfterSec: Math.max(1, Math.ceil((ttl > 0 ? ttl : windowMs) / 1000)) };
    }
    return { ok: true as const, retryAfterSec: 0 };
  } catch (error) {
    console.error('Redis rate limit failed, falling back to memory:', error);
    return memoryRateLimit(key, limit, windowMs);
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'local';
}

// يرجع استجابة 429 جاهزة إذا تجاوز الحد، وإلا null
export async function limitOrResponse(key: string, limit: number, windowMs: number) {
  const r = await rateLimit(key, limit, windowMs);
  if (r.ok) return null;
  return NextResponse.json(
    { success: false, error: 'محاولات كثيرة، حاول مرة أخرى لاحقًا' },
    { status: 429, headers: { 'Retry-After': String(r.retryAfterSec) } }
  );
}

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'salon_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 يوم

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  ownerId: string;
  tenantId: string;
  email: string;
  // إذا كانت الجلسة صادرة عن أدمن (دخول بدل المالك): بريد الأدمن
  imp?: string;
}

export async function createSession(payload: SessionPayload, opts: { maxAgeSeconds?: number; issuedAt?: number } = {}) {
  const maxAge = opts.maxAgeSeconds ?? MAX_AGE_SECONDS;
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(opts.issuedAt)
    .setExpirationTime(`${maxAge}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.ownerId !== 'string' ||
      typeof payload.tenantId !== 'string' ||
      typeof payload.email !== 'string'
    ) {
      return null;
    }
    // الحساب يجب أن يبقى موجودًا وغير موقوف، وإلا تسقط الجلسة فورًا (حذف/إيقاف من الأدمن)
    const owner = await prisma.owner.findUnique({
      where: { id: payload.ownerId },
      select: { tenantId: true, suspendedAt: true, passwordChangedAt: true },
    });
    if (!owner || owner.suspendedAt || owner.tenantId !== payload.tenantId) return null;
    // جلسة صدرت قبل آخر تغيير/استعادة لكلمة المرور → مرفوضة (iat بالثواني)
    if (owner.passwordChangedAt && (payload.iat ?? 0) <= Math.floor(owner.passwordChangedAt.getTime() / 1000)) return null;

    return {
      ownerId: payload.ownerId,
      tenantId: payload.tenantId,
      email: payload.email,
      ...(typeof payload.imp === 'string' ? { imp: payload.imp } : {}),
    };
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

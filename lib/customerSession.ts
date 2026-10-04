import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'salon_customer_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 يوم

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }
  return new TextEncoder().encode(secret);
}

export interface CustomerSessionPayload {
  accountId: string;
  email: string;
  name: string;
}

// جلسة عميل منفصلة تمامًا عن جلسة صاحب الصالون وجلسة الأدمن — كوكي مختلف
// الاسم، ولا يمكن الخلط بينها أو الترقية من واحدة لأخرى بأي شكل.
export async function createCustomerSession(payload: CustomerSessionPayload, opts: { issuedAt?: number } = {}) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(opts.issuedAt)
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  });
}

export async function getCustomerSession(): Promise<CustomerSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.accountId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.name !== 'string'
    ) {
      return null;
    }
    const account = await prisma.customerAccount.findUnique({
      where: { id: payload.accountId },
      select: { suspendedAt: true, passwordChangedAt: true },
    });
    if (!account || account.suspendedAt) return null;
    if (account.passwordChangedAt && (payload.iat ?? 0) <= Math.floor(account.passwordChangedAt.getTime() / 1000)) return null;

    return { accountId: payload.accountId, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

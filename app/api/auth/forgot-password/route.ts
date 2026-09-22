import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { issueToken } from '@/lib/authTokens';
import { actionEmail, appOrigin, sendEmail } from '@/lib/email';
import { clientIp, limitOrResponse } from '@/lib/rateLimit';
import { localeFromRequest } from '@/lib/verification';

// دائمًا نرجع نفس الاستجابة سواء وُجد الحساب أو لا، حتى لا نكشف من مسجّل
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const audience = ['owner', 'customer', 'admin'].includes(body.audience) ? (body.audience as 'owner' | 'customer' | 'admin') : null;
    if (!email || !audience) {
      return NextResponse.json({ success: false, error: 'البريد الإلكتروني مطلوب' }, { status: 400 });
    }

    const limited =
      (await limitOrResponse(`forgot:ip:${clientIp(request)}`, 10, 60 * 60 * 1000)) ||
      (await limitOrResponse(`forgot:email:${email}`, 3, 60 * 60 * 1000));
    if (limited) return limited;

    const account =
      audience === 'owner'
        ? await prisma.owner.findUnique({ where: { email }, select: { id: true, suspendedAt: true } })
        : audience === 'admin'
          ? await prisma.admin.findUnique({ where: { email }, select: { id: true } })
          : await prisma.customerAccount.findUnique({ where: { email }, select: { id: true, suspendedAt: true } });

    if (account && !('suspendedAt' in account && account.suspendedAt)) {
      const locale = localeFromRequest(request);
      const raw = await issueToken('RESET_PASSWORD', audience, account.id, email);
      const link = `${appOrigin(request)}/${locale}/reset-password?audience=${audience}&token=${raw}`;
      await sendEmail({ to: email, ...actionEmail('reset', link, locale) });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('forgot-password error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 });
  }
}

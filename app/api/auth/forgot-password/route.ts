import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { issueToken } from '@/lib/authTokens';
import { actionEmail, appOrigin, sendEmail } from '@/lib/email';
import { clientIp, limitOrResponse } from '@/lib/rateLimit';
import { localeFromRequest } from '@/lib/verification';

// دائمًا نرجع نفس الاستجابة سواء وُجد الحساب أو لا، حتى لا نكشف من مسجّل.
// audience اختياري الآن (نموذج الدخول الموحّد لا يعرفه): إن لم يُرسَل نجرّب
// صاحب الصالون ثم العميل تلقائيًا — أبدًا لا نبحث في جدول الأدمن بلا audience
// صريح، فحساب الأدمن يبقى منفصلاً بقرار أمني كما في تسجيل الدخول.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const explicitAudience = ['owner', 'customer', 'admin'].includes(body.audience)
      ? (body.audience as 'owner' | 'customer' | 'admin')
      : null;
    if (!email) {
      return NextResponse.json({ success: false, error: 'البريد الإلكتروني مطلوب' }, { status: 400 });
    }

    const limited =
      (await limitOrResponse(`forgot:ip:${clientIp(request)}`, 10, 60 * 60 * 1000)) ||
      (await limitOrResponse(`forgot:email:${email}`, 3, 60 * 60 * 1000));
    if (limited) return limited;

    let audience: 'owner' | 'customer' | 'admin' | null = explicitAudience;
    let account: { id: string; suspendedAt?: Date | null } | null = null;

    if (audience === 'owner') {
      account = await prisma.owner.findUnique({ where: { email }, select: { id: true, suspendedAt: true } });
    } else if (audience === 'admin') {
      account = await prisma.admin.findUnique({ where: { email }, select: { id: true } });
    } else if (audience === 'customer') {
      account = await prisma.customerAccount.findUnique({ where: { email }, select: { id: true, suspendedAt: true } });
    } else {
      const owner = await prisma.owner.findUnique({ where: { email }, select: { id: true, suspendedAt: true } });
      if (owner) {
        audience = 'owner';
        account = owner;
      } else {
        const customer = await prisma.customerAccount.findUnique({ where: { email }, select: { id: true, suspendedAt: true } });
        if (customer) {
          audience = 'customer';
          account = customer;
        }
      }
    }

    if (audience && account && !account.suspendedAt) {
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

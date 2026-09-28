import { NextResponse } from 'next/server';
import { clientIp, limitOrResponse } from '@/lib/rateLimit';
import { sendVerificationEmail } from '@/lib/verification';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { createCustomerSession } from '@/lib/customerSession';
import { isHoneypotFilled } from '@/lib/honeypot';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { CONSENT_TYPES, recordConsent } from '@/lib/legal';
import { generateUniqueReferralCode } from '@/lib/referral';

export async function POST(request: Request) {
  try {
    const limited = await limitOrResponse(`register-customer:${clientIp(request)}`, 10, 60 * 60 * 1000);
    if (limited) return limited;

    const body = await request.json();
    if (isHoneypotFilled(body)) {
      return NextResponse.json({ success: false, error: 'فشل إنشاء الحساب' }, { status: 400 });
    }
    if (!(await verifyTurnstileToken(body.turnstileToken, clientIp(request)))) {
      return NextResponse.json({ success: false, error: 'فشل التحقق من أنك لست روبوت' }, { status: 400 });
    }
    const { name, email, password } = body;

    if (body.acceptTerms !== true) {
      return NextResponse.json(
        { success: false, error: 'يجب الموافقة على شروط الاستخدام وسياسة الخصوصية' },
        { status: 400 }
      );
    }

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await prisma.customerAccount.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل' },
        { status: 409 }
      );
    }

    // بريد صاحب الصالون منفصل عن بريد حساب العميل دائمًا (يسمح بدخول موحّد
    // يتعرّف على نوع الحساب من البريد وحده دون التباس)
    const existingOwner = await prisma.owner.findUnique({ where: { email: normalizedEmail } });
    if (existingOwner) {
      return NextResponse.json(
        { success: false, error: 'هذا البريد مسجَّل كحساب صاحب صالون بالفعل، استخدم بريدًا آخر لحساب العميل' },
        { status: 409 }
      );
    }

    // كود دعوة صديق اختياري في الرابط (?ref=CODE): كود غير صالح أو ذاتي
    // يُتجاهل بصمت بدل إفشال التسجيل — الإحالة ميزة إضافية لا شرط تسجيل
    let referredByAccountId: string | null = null;
    if (typeof body.ref === 'string' && body.ref.trim()) {
      const referrer = await prisma.customerAccount.findUnique({
        where: { referralCode: body.ref.trim().toUpperCase() },
        select: { id: true },
      });
      if (referrer) referredByAccountId = referrer.id;
    }

    const passwordHash = await hashPassword(password);
    const referralCode = await generateUniqueReferralCode();
    const account = await prisma.customerAccount.create({
      data: { name, email: normalizedEmail, passwordHash, referralCode, referredByAccountId },
    });

    const ip = clientIp(request);
    await recordConsent({ accountId: account.id, type: CONSENT_TYPES.DATA_PROCESSING, granted: true, ip });
    if (body.marketingOptIn === true) {
      await recordConsent({ accountId: account.id, type: CONSENT_TYPES.MARKETING, granted: true, ip });
    }

    await sendVerificationEmail(request, 'customer', account.id, account.email).catch((e) => console.error('verification email failed', e));
    await createCustomerSession({ accountId: account.id, email: account.email, name: account.name });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error registering customer account:', error);
    return NextResponse.json(
      { success: false, error: 'فشل إنشاء الحساب', details: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { clientIp, limitOrResponse } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/session';
import { createCustomerSession } from '@/lib/customerSession';
import { tr } from '@/lib/apiLocale';
import { CUSTOMER_SIDE_ENABLED } from '@/lib/retired';

// دخول موحّد لصاحب الصالون والعميل: يتعرّف على نوع الحساب من البريد نفسه
// فلا يحتاج الزائر معرفة أي رابط يستخدم. الأدمن مستثنى عمدًا (يبقى منفصلاً
// بقرار أمني — لا يُكشف من نموذج عام أن بريدًا معينًا هو حساب أدمن).
// كل بريد ينتمي لجهة واحدة فقط (صاحب صالون أو عميل)، يُمنع تكراره عبر
// الجدولين عند التسجيل، فلا حاجة لتجربة كلمة المرور على الجدولين معًا.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: await tr('البريد الإلكتروني وكلمة المرور مطلوبان') },
        { status: 400 }
      );
    }

    const limited =
      (await limitOrResponse(`login:ip:${clientIp(request)}`, 40, 15 * 60 * 1000)) ||
      (await limitOrResponse(`login:email:${email}`, 10, 15 * 60 * 1000));
    if (limited) return limited;

    const invalidCreds = async () =>
      NextResponse.json({ success: false, error: await tr('بيانات الدخول غير صحيحة') }, { status: 401 });

    const owner = await prisma.owner.findUnique({ where: { email } });
    if (owner) {
      if (owner.suspendedAt) {
        return NextResponse.json({ success: false, error: await tr('هذا الحساب موقوف، تواصل مع إدارة المنصة') }, { status: 403 });
      }
      if (!(await verifyPassword(password, owner.passwordHash))) return invalidCreds();

      await createSession({ ownerId: owner.id, tenantId: owner.tenantId, email: owner.email });
      return NextResponse.json({ success: true, role: 'owner' }, { status: 200 });
    }

    // دخول العملاء متوقف (المنصة لأصحاب الصالونات فقط)؛ يعود المفتاح في lib/retired.ts
    const account = CUSTOMER_SIDE_ENABLED ? await prisma.customerAccount.findUnique({ where: { email } }) : null;
    if (account) {
      if (account.suspendedAt) {
        return NextResponse.json({ success: false, error: await tr('هذا الحساب موقوف، تواصل مع إدارة المنصة') }, { status: 403 });
      }
      if (!(await verifyPassword(password, account.passwordHash))) return invalidCreds();

      await createCustomerSession({ accountId: account.id, email: account.email, name: account.name });
      return NextResponse.json({ success: true, role: 'customer' }, { status: 200 });
    }

    return invalidCreds();
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: await tr('فشل تسجيل الدخول') },
      { status: 500 }
    );
  }
}

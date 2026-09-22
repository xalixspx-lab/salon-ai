import { NextResponse } from 'next/server';
import { clientIp, limitOrResponse } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { createAdminSession } from '@/lib/adminSession';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }

    const limited =
      (await limitOrResponse(`login-admin:ip:${clientIp(request)}`, 40, 15 * 60 * 1000)) ||
      (await limitOrResponse(`login-admin:email:${email}`, 10, 15 * 60 * 1000));
    if (limited) return limited;

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return NextResponse.json({ success: false, error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }

    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }

    await createAdminSession({ adminId: admin.id, email: admin.email });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'فشل تسجيل الدخول', details: error.message },
      { status: 500 }
    );
  }
}

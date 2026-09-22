import { NextResponse } from 'next/server';
import { clientIp, limitOrResponse } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { createAdminSession } from '@/lib/adminSession';

// تسجيل أول حساب أدمن للمنصة — يعمل مرة واحدة فقط. بمجرد وجود حساب أدمن
// واحد، هذا المسار يرفض أي محاولة تسجيل جديدة نهائيًا. لا يوجد رمز سري يُدار
// أو يُشارك — أول من يقدّم هذا النموذج يصبح الأدمن.
export async function POST(request: Request) {
  try {
    const limited = await limitOrResponse(`register-admin:${clientIp(request)}`, 10, 60 * 60 * 1000);
    if (limited) return limited;

    const existingCount = await prisma.admin.count();
    if (existingCount > 0) {
      return NextResponse.json(
        { success: false, error: 'يوجد حساب أدمن مسجل بالفعل لهذه المنصة' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password } = body;

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
    const passwordHash = await hashPassword(password);

    const admin = await prisma.admin.create({
      data: { name, email: normalizedEmail, passwordHash },
    });

    await createAdminSession({ adminId: admin.id, email: admin.email });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error registering admin:', error);
    return NextResponse.json(
      { success: false, error: 'فشل إنشاء حساب الأدمن', details: error.message },
      { status: 500 }
    );
  }
}

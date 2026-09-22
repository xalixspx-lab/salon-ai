import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { consumeToken } from '@/lib/authTokens';
import { hashPassword } from '@/lib/password';
import { clientIp, limitOrResponse } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const limited = await limitOrResponse(`reset:ip:${clientIp(request)}`, 20, 60 * 60 * 1000);
    if (limited) return limited;

    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const audience = ['owner', 'customer', 'admin'].includes(body.audience) ? (body.audience as 'owner' | 'customer' | 'admin') : null;

    if (!token || !audience) {
      return NextResponse.json({ success: false, error: 'رابط غير صالح' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
        { status: 400 }
      );
    }

    const row = await consumeToken('RESET_PASSWORD', audience, token);
    if (!row) {
      return NextResponse.json({ success: false, error: 'الرابط منتهي أو مستخدم من قبل' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    // استلام رابط الاستعادة يثبت ملكية البريد أيضًا
    const data = { passwordHash, emailVerifiedAt: new Date() };
    if (audience === 'admin') {
      await prisma.admin.update({ where: { id: row.subjectId }, data: { passwordHash, mustChangePassword: false } });
    } else if (audience === 'owner') {
      await prisma.owner.update({ where: { id: row.subjectId }, data });
    } else {
      await prisma.customerAccount.update({ where: { id: row.subjectId }, data });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('reset-password error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 });
  }
}

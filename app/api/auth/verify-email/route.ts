import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { consumeToken } from '@/lib/authTokens';
import { clientIp, limitOrResponse } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const limited = await limitOrResponse(`verify:ip:${clientIp(request)}`, 30, 60 * 60 * 1000);
    if (limited) return limited;

    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token : '';
    const audience = body.audience === 'customer' ? 'customer' : body.audience === 'owner' ? 'owner' : null;
    if (!token || !audience) {
      return NextResponse.json({ success: false, error: 'رابط غير صالح' }, { status: 400 });
    }

    const row = await consumeToken('VERIFY_EMAIL', audience, token);
    if (!row) {
      return NextResponse.json({ success: false, error: 'الرابط منتهي أو مستخدم من قبل' }, { status: 400 });
    }

    const data = { emailVerifiedAt: new Date() };
    if (audience === 'owner') {
      await prisma.owner.updateMany({ where: { id: row.subjectId, email: row.email }, data });
    } else {
      await prisma.customerAccount.updateMany({ where: { id: row.subjectId, email: row.email }, data });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('verify-email error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 });
  }
}

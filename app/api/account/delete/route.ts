import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSession, clearCustomerSession } from '@/lib/customerSession';
import { verifyPassword } from '@/lib/password';
import { limitOrResponse } from '@/lib/rateLimit';

// حذف العميل لحسابه بنفسه (حق المحو — PDPL). يتطلب كلمة المرور. تُحذف بياناته
// الشخصية وتقييماته ومفضلاته، وتبقى سجلات الحجز عند الصالونات مفصولة عن هويته.
export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const limited = await limitOrResponse(`delete-account:${session.accountId}`, 5, 15 * 60 * 1000);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const account = await prisma.customerAccount.findUnique({ where: { id: session.accountId } });
  if (!account || typeof body.password !== 'string' || !(await verifyPassword(body.password, account.passwordHash))) {
    return NextResponse.json({ success: false, error: 'كلمة المرور غير صحيحة' }, { status: 400 });
  }

  await prisma.customerAccount.delete({ where: { id: account.id } });
  await clearCustomerSession();
  return NextResponse.json({ success: true });
}

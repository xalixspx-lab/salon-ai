import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customerSession';
import { limitOrResponse } from '@/lib/rateLimit';

// تصدير كل بيانات العميل الشخصية (حق الاطلاع/النقل — PDPL). JSON قابل للتنزيل.
export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const limited = await limitOrResponse(`export:${session.accountId}`, 5, 60 * 60 * 1000);
  if (limited) return limited;

  const account = await prisma.customerAccount.findUnique({
    where: { id: session.accountId },
    select: { id: true, name: true, email: true, emailVerifiedAt: true, points: true, createdAt: true },
  });
  const [salonRecords, reviews, favorites, consents] = await Promise.all([
    prisma.customer.findMany({
      where: { accountId: session.accountId },
      select: {
        name: true,
        phone: true,
        createdAt: true,
        tenant: { select: { name: true } },
        appointments: {
          select: { status: true, startTime: true, endTime: true, totalAmount: true, depositAmount: true, service: { select: { name: true } } },
          orderBy: { startTime: 'desc' },
        },
      },
    }),
    prisma.review.findMany({ where: { accountId: session.accountId }, select: { rating: true, comment: true, createdAt: true, tenant: { select: { name: true } } } }),
    prisma.favorite.findMany({ where: { accountId: session.accountId }, select: { createdAt: true, tenant: { select: { name: true } } } }),
    prisma.consentLog.findMany({ where: { accountId: session.accountId }, orderBy: { recordedAt: 'asc' }, select: { consentType: true, granted: true, version: true, recordedAt: true } }),
  ]);

  const payload = { exportedAt: new Date().toISOString(), account, salonRecords, reviews, favorites, consents };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="my-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

import { NextResponse } from 'next/server';
import { CUSTOMER_SIDE_ENABLED, retiredResponse } from '@/lib/retired';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customerSession';

export async function GET() {
  if (!CUSTOMER_SIDE_ENABLED) return retiredResponse();
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const linkedCustomers = await prisma.customer.findMany({
    where: { accountId: session.accountId },
    select: { id: true, tenantId: true },
  });
  const tenantIds = Array.from(new Set(linkedCustomers.map((c) => c.tenantId)));
  const customerIds = linkedCustomers.map((c) => c.id);

  const [offers, upcoming] = await Promise.all([
    // عروض نشطة لدى الصالونات اللي سبق للعميل يحجز فيها
    tenantIds.length > 0
      ? prisma.offer.findMany({
          where: {
            tenantId: { in: tenantIds },
            isActive: true,
            OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
          },
          include: { tenant: { select: { name: true } }, appliesToService: true, freeService: true },
          orderBy: { createdAt: 'desc' },
        })
      : [],
    // تذكير بالمواعيد القادمة
    customerIds.length > 0
      ? prisma.appointment.findMany({
          where: {
            customerId: { in: customerIds },
            startTime: { gte: new Date() },
            status: { in: ['CONFIRMED', 'PENDING_DEPOSIT'] },
          },
          include: { tenant: { select: { name: true } }, service: { select: { name: true } } },
          orderBy: { startTime: 'asc' },
        })
      : [],
  ]);

  return NextResponse.json({ success: true, data: { offers, upcoming } }, { status: 200 });
}

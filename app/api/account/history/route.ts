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

  // كل سجلات Customer (CRM) المرتبطة بهذا الحساب عبر مختلف الصالونات
  const customerRows = await prisma.customer.findMany({
    where: { accountId: session.accountId },
    select: { id: true },
  });
  const customerIds = customerRows.map((c) => c.id);

  const appointments = await prisma.appointment.findMany({
    where: { customerId: { in: customerIds } },
    orderBy: { startTime: 'desc' },
    include: {
      tenant: { select: { name: true, id: true } },
      service: { select: { name: true } },
      appliedOffer: { include: { appliesToService: true, freeService: true } },
    },
  });

  return NextResponse.json({ success: true, data: appointments }, { status: 200 });
}

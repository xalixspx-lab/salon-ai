import { NextResponse } from 'next/server';
import { CUSTOMER_SIDE_ENABLED, retiredResponse } from '@/lib/retired';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customerSession';
import { PUBLIC_TENANT } from '@/lib/visibility';

export async function GET() {
  if (!CUSTOMER_SIDE_ENABLED) return retiredResponse();
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.favorite.findMany({ where: { accountId: session.accountId }, select: { tenantId: true } });
  return NextResponse.json({ success: true, data: rows.map((r) => r.tenantId) });
}

// POST { tenantId, favorite: boolean } — إضافة/إزالة من المفضلة (idempotent)
export async function POST(request: Request) {
  if (!CUSTOMER_SIDE_ENABLED) return retiredResponse();
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.tenantId !== 'string') {
    return NextResponse.json({ success: false, error: 'tenantId required' }, { status: 400 });
  }

  if (body.favorite === false) {
    await prisma.favorite.deleteMany({ where: { accountId: session.accountId, tenantId: body.tenantId } });
  } else {
    const tenant = await prisma.tenant.findFirst({ where: { id: body.tenantId, ...PUBLIC_TENANT }, select: { id: true } });
    if (!tenant) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    await prisma.favorite.upsert({
      where: { accountId_tenantId: { accountId: session.accountId, tenantId: body.tenantId } },
      create: { accountId: session.accountId, tenantId: body.tenantId },
      update: {},
    });
  }
  return NextResponse.json({ success: true });
}

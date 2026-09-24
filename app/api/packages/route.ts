import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { withTenantScope } from '@/lib/tenantScope';

// باقات الجلسات لعملاء صالون. للمالك فقط: tenantId يُؤخذ من الجلسة دائمًا، ولا
// يُقبل من العميل (كانت هذه النقطة مفتوحة بدون مصادقة).

// GET: باقات عملاء صالوني
async function GETHandler() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const packages = await prisma.customerPackage.findMany({ where: { tenantId: session.tenantId } });
  return NextResponse.json({ success: true, count: packages.length, data: packages }, { status: 200 });
}

// POST: تخصيص باقة جديدة لعميل من عملاء صالوني
async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { customerId, packageName, totalSessions, price } = body;
    const sessions = parseInt(totalSessions, 10);
    const amount = parseFloat(price);

    if (!customerId || !(sessions > 0) || !(amount >= 0)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid fields for package creation' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId: session.tenantId } });
    if (!customer) {
      return NextResponse.json({ success: false, error: 'العميل غير موجود' }, { status: 404 });
    }

    const newPackage = await prisma.customerPackage.create({
      data: {
        tenantId: session.tenantId,
        customerId,
        packageName: packageName || { ar: 'باقة مميزة', en: 'Special Package' },
        totalSessions: sessions,
        remainingSessions: sessions,
        price: amount,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ success: true, data: newPackage }, { status: 201 });
  } catch (error) {
    console.error('Error creating customer package:', error);
    return NextResponse.json({ success: false, error: 'Failed to create package' }, { status: 500 });
  }
}

export const GET = withTenantScope(GETHandler);
export const POST = withTenantScope(POSTHandler);

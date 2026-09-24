import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { withTenantScope } from '@/lib/tenantScope';

async function GETHandler() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const customers = await prisma.customer.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
    include: {
      appointments: { select: { startTime: true }, orderBy: { startTime: 'desc' } },
    },
  });

  const data = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    totalVisits: c.appointments.length,
    lastVisit: c.appointments[0]?.startTime || null,
  }));

  return NextResponse.json({ success: true, data }, { status: 200 });
}

async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم العميل مطلوب' }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: { tenantId: session.tenantId, name, phone: phone || null },
    });

    return NextResponse.json({ success: true, data: customer }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { success: false, error: 'فشل إضافة العميل', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withTenantScope(GETHandler);
export const POST = withTenantScope(POSTHandler);

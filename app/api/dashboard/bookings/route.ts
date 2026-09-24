import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { createAppointmentGuarded, isSlotConflict } from '@/lib/availability';
import { withTenantScope } from '@/lib/tenantScope';

async function GETHandler(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const range =
    from && to && !Number.isNaN(Date.parse(from)) && !Number.isNaN(Date.parse(to))
      ? { startTime: { gte: new Date(from), lt: new Date(to) } }
      : {};

  const bookings = await prisma.appointment.findMany({
    where: { tenantId: session.tenantId, ...range },
    orderBy: { startTime: 'desc' },
    include: { service: true, customer: true, employee: true },
  });

  return NextResponse.json({ success: true, data: bookings }, { status: 200 });
}

// إنشاء حجز يدويًا من لوحة تحكم صاحب الصالون (وليس من العميل مباشرة).
// tenantId يُؤخذ من الجلسة دائمًا، ونتحقق أن العميل/الخدمة/الموظف المختارين
// يتبعون فعليًا لنفس الصالون قبل الربط بينهم.
async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { customerId, serviceId, employeeId, startTime } = body;

    if (!serviceId || !startTime) {
      return NextResponse.json(
        { success: false, error: 'الخدمة والوقت مطلوبان' },
        { status: 400 }
      );
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId: session.tenantId },
    });
    if (!service) {
      return NextResponse.json({ success: false, error: 'الخدمة غير موجودة' }, { status: 404 });
    }

    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, tenantId: session.tenantId },
      });
      if (!customer) {
        return NextResponse.json({ success: false, error: 'العميل غير موجود' }, { status: 404 });
      }
    }

    if (employeeId) {
      const staff = await prisma.staff.findFirst({
        where: { id: employeeId, tenantId: session.tenantId },
      });
      if (!staff) {
        return NextResponse.json({ success: false, error: 'الموظف غير موجود' }, { status: 404 });
      }
    }

    const basePrice = service.basePrice ? Number(service.basePrice) : 0;
    const startDateTime = new Date(startTime);
    const durationMinutes = service.baseDurationMinutes || 60;
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

    const appointment = await createAppointmentGuarded(
      {
        tenantId: session.tenantId,
        customerId: customerId || null,
        employeeId: employeeId || null,
        serviceId,
        status: 'CONFIRMED',
        totalAmount: basePrice,
        paymentStatus: 'UNPAID',
        startTime: startDateTime,
        endTime: endDateTime,
      },
      {
        tenant: (await prisma.tenant.findUnique({
          where: { id: session.tenantId },
          select: { timezone: true, workingHours: true },
        }))!,
        enforceHours: false, // المالك يقدر يضيف حجزًا خارج الدوام يدويًا
        autoAssign: false,
      },
      { service: true, customer: true, employee: true }
    );

    return NextResponse.json({ success: true, data: appointment }, { status: 201 });
  } catch (error: any) {
    if (isSlotConflict(error)) {
      return NextResponse.json(
        { success: false, error: 'هذا الموظف لديه حجز آخر في نفس الوقت' },
        { status: 409 }
      );
    }
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { success: false, error: 'فشل إنشاء الحجز', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withTenantScope(GETHandler);
export const POST = withTenantScope(POSTHandler);

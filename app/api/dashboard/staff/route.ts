import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getTenantSubscription, upgradeRequired } from '@/lib/subscription';
import { withTenantScope } from '@/lib/tenantScope';

async function GETHandler() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const staff = await prisma.staff.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, data: staff }, { status: 200 });
}

async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, role, phone, status } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم الموظف مطلوب' }, { status: 400 });
    }

    const sub = await getTenantSubscription(session.tenantId);
    if (sub && sub.maxStaff !== null) {
      const count = await prisma.staff.count({ where: { tenantId: session.tenantId } });
      if (count >= sub.maxStaff) {
        return upgradeRequired(
          sub.trialExpired
            ? 'انتهت الفترة التجريبية، اختر باقة للمتابعة'
            : `باقتك الحالية تسمح بـ ${sub.maxStaff} موظفين كحد أقصى، رقّ باقتك لإضافة المزيد`
        );
      }
    }

    const member = await prisma.staff.create({
      data: {
        tenantId: session.tenantId,
        name,
        role: role || null,
        phone: phone || null,
        status: status === 'ON_LEAVE' ? 'ON_LEAVE' : 'ACTIVE',
      },
    });

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { success: false, error: 'فشل إضافة الموظف', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withTenantScope(GETHandler);
export const POST = withTenantScope(POSTHandler);

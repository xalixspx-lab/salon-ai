import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { Prisma } from '@prisma/client';
import { parseWeeklyHours } from '@/lib/schedule';
import { withTenantScope } from '@/lib/tenantScope';

async function assertOwnedByTenant(id: string, tenantId: string) {
  const member = await prisma.staff.findUnique({ where: { id } });
  return member && member.tenantId === tenantId;
}

async function PATCHHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!(await assertOwnedByTenant(id, session.tenantId))) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { name, role, phone, status } = body;

    // null = يتبع دوام الصالون
    let workingHoursUpdate = {};
    if (body.workingHours !== undefined) {
      if (body.workingHours === null) {
        workingHoursUpdate = { workingHours: Prisma.JsonNull };
      } else {
        const parsed = parseWeeklyHours(body.workingHours);
        if (!parsed) {
          return NextResponse.json({ success: false, error: 'ساعات الدوام غير صالحة' }, { status: 400 });
        }
        workingHoursUpdate = { workingHours: parsed };
      }
    }

    const member = await prisma.staff.update({
      where: { id },
      data: {
        ...workingHoursUpdate,
        ...(name ? { name } : {}),
        ...(role !== undefined ? { role: role || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json({ success: true, data: member }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating staff:', error);
    return NextResponse.json(
      { success: false, error: 'فشل تحديث بيانات الموظف', details: error.message },
      { status: 500 }
    );
  }
}

async function DELETEHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!(await assertOwnedByTenant(id, session.tenantId))) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  await prisma.staff.delete({ where: { id } });
  return NextResponse.json({ success: true }, { status: 200 });
}

export const PATCH = withTenantScope(PATCHHandler);
export const DELETE = withTenantScope(DELETEHandler);

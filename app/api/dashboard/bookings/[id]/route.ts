import { NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { hasConflict } from '@/lib/availability';
import { notifyBooking } from '@/lib/notify';
import { awardCompletionPoints } from '@/lib/loyalty';
import { withTenantScope } from '@/lib/tenantScope';

const VALID_STATUSES = ['PENDING_DEPOSIT', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

async function PATCHHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing || existing.tenantId !== session.tenantId) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: 'حالة غير صحيحة' }, { status: 400 });
    }

    // إعادة تفعيل حجز ملغي يجب ألا تُنشئ تعارضًا مع حجز آخر أُخذ وقته
    const reactivating = existing.status === 'CANCELLED' && status !== 'CANCELLED';
    if (reactivating && existing.employeeId && existing.startTime && existing.endTime) {
      if (await hasConflict(prisma, existing.tenantId!, existing.employeeId, existing.startTime, existing.endTime, existing.id)) {
        return NextResponse.json(
          { success: false, error: 'لا يمكن إعادة التفعيل: الموظف لديه حجز آخر في هذا الوقت' },
          { status: 409 }
        );
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: { service: true, customer: true, employee: true },
    });

    if (status === 'CANCELLED' && existing.status !== 'CANCELLED') {
      after(() => notifyBooking(id, 'cancelled', ['customer']));
    }
    if (status === 'CONFIRMED' && existing.status !== 'CONFIRMED') {
      after(() => notifyBooking(id, 'confirmed', ['customer']));
    }
    if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      after(() => notifyBooking(id, 'completed', ['customer']));
      after(() => awardCompletionPoints(existing.customerId));
    }

    return NextResponse.json({ success: true, data: appointment }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { success: false, error: 'فشل تحديث الحجز', details: error.message },
      { status: 500 }
    );
  }
}

export const PATCH = withTenantScope(PATCHHandler);

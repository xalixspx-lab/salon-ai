import { NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { hasConflict } from '@/lib/availability';
import { notifyBooking } from '@/lib/notify';
import { awardCompletionPoints, awardReferralBonusIfEligible } from '@/lib/loyalty';
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

    // الحجز المكتمل نهائي: الرجوع عنه ثم إكماله مجددًا كان يمنح نقاط الولاء
    // ومكافأة الإحالة أكثر من مرة. والمُلغى لا يُكمَل مباشرة (يُعاد تفعيله أولًا)
    if (existing.status === 'COMPLETED' && status !== 'COMPLETED') {
      return NextResponse.json({ success: false, error: 'لا يمكن تغيير حالة حجز مكتمل' }, { status: 409 });
    }
    if (existing.status === 'CANCELLED' && status === 'COMPLETED') {
      return NextResponse.json({ success: false, error: 'فعّل الحجز الملغي أولًا قبل إكماله' }, { status: 409 });
    }

    // أي انتقال إلى حالة "تشغل الوقت" (تأكيد/عربون/إكمال) يجب ألا يتعارض مع حجز
    // آخر أُخذ وقته — يشمل إعادة تفعيل ملغي، وتأكيد حجز انتهت مهلة عربونه
    // (15 دقيقة) وأخذ آخر مكانه
    const occupiesSlot = (status === 'CONFIRMED' || status === 'PENDING_DEPOSIT') && existing.status !== status;
    if (occupiesSlot && existing.employeeId && existing.startTime && existing.endTime) {
      if (await hasConflict(prisma, existing.tenantId!, existing.employeeId, existing.startTime, existing.endTime, existing.id)) {
        return NextResponse.json(
          { success: false, error: 'لا يمكن تغيير الحالة: الموظف لديه حجز آخر في هذا الوقت' },
          { status: 409 }
        );
      }
    }

    // تحديث بشرط الحالة السابقة: طلبان متزامنان لا يمرّان معًا (كانا يمنحان النقاط مرتين)
    const updated = await prisma.appointment.updateMany({
      where: { id, tenantId: session.tenantId, status: existing.status },
      data: { status },
    });
    if (updated.count === 0) {
      return NextResponse.json({ success: false, error: 'تم تحديث هذا الحجز للتو، أعد المحاولة' }, { status: 409 });
    }
    const appointment = await prisma.appointment.findUniqueOrThrow({
      where: { id },
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
      after(() => awardReferralBonusIfEligible(existing.customerId));
    }

    return NextResponse.json({ success: true, data: appointment }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { success: false, error: 'فشل تحديث الحجز' },
      { status: 500 }
    );
  }
}

export const PATCH = withTenantScope(PATCHHandler);

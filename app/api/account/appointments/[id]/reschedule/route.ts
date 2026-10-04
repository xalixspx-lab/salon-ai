import { NextResponse, after } from 'next/server';
import { loadOwnedAppointment } from '@/lib/customerAppointments';
import { isOutsideHours, isSlotConflict, rescheduleAppointmentGuarded } from '@/lib/availability';
import { notifyBooking } from '@/lib/notify';
import { tr } from '@/lib/apiLocale';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadOwnedAppointment(id);
  if ('error' in loaded) {
    return NextResponse.json({ success: false, error: loaded.error }, { status: loaded.status });
  }

  try {
    const body = await request.json();
    const newStart = new Date(body.startTime);
    if (Number.isNaN(newStart.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid startTime' }, { status: 400 });
    }

    const { tenant } = loaded;
    if (newStart.getTime() < Date.now() + tenant.minBookingNoticeHours * 3600 * 1000) {
      return NextResponse.json(
        { success: false, error: `يجب الحجز قبل الموعد بـ ${tenant.minBookingNoticeHours} ساعة على الأقل` },
        { status: 400 }
      );
    }

    const updated = await rescheduleAppointmentGuarded(id, newStart, tenant);
    after(() => notifyBooking(id, 'rescheduled', ['owner', 'customer']));
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isOutsideHours(error)) {
      return NextResponse.json({ success: false, error: await tr('الوقت المختار خارج ساعات الدوام') }, { status: 400 });
    }
    if (isSlotConflict(error)) {
      return NextResponse.json({ success: false, error: await tr('هذا الوقت غير متاح، اختر وقتًا آخر') }, { status: 409 });
    }
    console.error('reschedule error:', error);
    return NextResponse.json({ success: false, error: await tr('فشل تغيير الموعد') }, { status: 500 });
  }
}

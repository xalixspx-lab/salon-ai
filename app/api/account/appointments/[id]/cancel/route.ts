import { NextResponse, after } from 'next/server';
import { CUSTOMER_SIDE_ENABLED, retiredResponse } from '@/lib/retired';
import { prisma } from '@/lib/prisma';
import { loadOwnedAppointment } from '@/lib/customerAppointments';
import { notifyBooking } from '@/lib/notify';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!CUSTOMER_SIDE_ENABLED) return retiredResponse();
  const { id } = await params;
  const loaded = await loadOwnedAppointment(id);
  if ('error' in loaded) {
    return NextResponse.json({ success: false, error: loaded.error }, { status: loaded.status });
  }

  await prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED' } });
  after(() => notifyBooking(id, 'cancelled', ['owner', 'customer']));
  return NextResponse.json({ success: true });
}

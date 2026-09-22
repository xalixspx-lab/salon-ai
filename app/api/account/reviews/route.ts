import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customerSession';
import { limitOrResponse } from '@/lib/rateLimit';

// تقييم موعد مكتمل. الشروط: الموعد يخص حساب العميل الحالي، حالته COMPLETED،
// ولم يُقيَّم من قبل (قيد فريد على appointment_id).
export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const limited = await limitOrResponse(`review:${session.accountId}`, 20, 60 * 60 * 1000);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const rating = Number(body.rating);
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 1000) : '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof body.appointmentId !== 'string') {
    return NextResponse.json({ success: false, error: 'تقييم غير صالح' }, { status: 400 });
  }

  const appt = await prisma.appointment.findFirst({
    where: { id: body.appointmentId, customer: { accountId: session.accountId } },
    select: { id: true, tenantId: true, status: true },
  });
  if (!appt || !appt.tenantId) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }
  if (appt.status !== 'COMPLETED') {
    return NextResponse.json({ success: false, error: 'يمكن التقييم بعد اكتمال الموعد فقط' }, { status: 400 });
  }

  try {
    const review = await prisma.review.create({
      data: {
        tenantId: appt.tenantId,
        accountId: session.accountId,
        appointmentId: appt.id,
        rating,
        comment: comment || null,
      },
    });
    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ success: false, error: 'تم تقييم هذا الموعد مسبقًا' }, { status: 409 });
    }
    throw error;
  }
}

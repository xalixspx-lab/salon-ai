import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { parseWeeklyHours } from '@/lib/schedule';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  if (!tenant) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: tenant }, { status: 200 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      city,
      workingHoursText,
      currency,
      timezone,
      descriptionAr,
      descriptionEn,
      phone,
      isPublished,
      depositPercentage,
      minBookingNoticeHours,
      cancellationHours,
      refundPercentAfterDeadline,
    } = body;

    let workingHoursUpdate = {};
    if (body.workingHours !== undefined) {
      const parsed = parseWeeklyHours(body.workingHours);
      if (!parsed) {
        return NextResponse.json({ success: false, error: 'ساعات الدوام غير صالحة' }, { status: 400 });
      }
      workingHoursUpdate = { workingHours: parsed };
    }

    const tenant = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: {
        ...workingHoursUpdate,
        ...(name ? { name } : {}),
        ...(city !== undefined ? { city: city || null } : {}),
        ...(workingHoursText !== undefined ? { workingHoursText: workingHoursText || null } : {}),
        ...(currency ? { currency } : {}),
        ...(timezone ? { timezone } : {}),
        ...(descriptionAr !== undefined || descriptionEn !== undefined
          ? {
              description:
                descriptionAr || descriptionEn
                  ? { ar: descriptionAr || '', en: descriptionEn || '' }
                  : Prisma.JsonNull,
            }
          : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(isPublished !== undefined ? { isPublished: Boolean(isPublished) } : {}),
        ...(depositPercentage !== undefined
          ? { depositPercentage: Math.max(0, Math.min(100, parseInt(depositPercentage, 10) || 0)) }
          : {}),
        ...(refundPercentAfterDeadline !== undefined
          ? { refundPercentAfterDeadline: Math.max(0, Math.min(100, parseInt(refundPercentAfterDeadline, 10) || 0)) }
          : {}),
        ...(cancellationHours !== undefined
          ? { cancellationHours: Math.max(0, parseInt(cancellationHours, 10) || 0) }
          : {}),
        ...(minBookingNoticeHours !== undefined
          ? { minBookingNoticeHours: Math.max(0, parseInt(minBookingNoticeHours, 10) || 0) }
          : {}),
      },
    });

    return NextResponse.json({ success: true, data: tenant }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, error: 'فشل تحديث الإعدادات', details: error.message },
      { status: 500 }
    );
  }
}

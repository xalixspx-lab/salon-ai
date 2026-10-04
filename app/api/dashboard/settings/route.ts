import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { parseWeeklyHours } from '@/lib/schedule';
import { withTenantScope } from '@/lib/tenantScope';

async function GETHandler() {
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

async function PATCHHandler(request: Request) {
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

    // مدخلات نصية: نوع وطول — منطقة زمنية غير صالحة كانت تكسر حساب المواعيد
    // لهذا الصالون كله (Intl.DateTimeFormat يرمي استثناءً)
    const isText = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
    if (
      (name !== undefined && (!isText(name, 255) || !name.trim())) ||
      (city !== undefined && city !== null && !isText(city, 100)) ||
      (phone !== undefined && phone !== null && !isText(phone, 50)) ||
      (workingHoursText !== undefined && workingHoursText !== null && !isText(workingHoursText, 500)) ||
      (descriptionAr !== undefined && descriptionAr !== null && !isText(descriptionAr, 2000)) ||
      (descriptionEn !== undefined && descriptionEn !== null && !isText(descriptionEn, 2000)) ||
      (currency && !(typeof currency === 'string' && /^[A-Za-z]{3}$/.test(currency)))
    ) {
      return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
    }
    if (timezone) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: String(timezone) });
      } catch {
        return NextResponse.json({ success: false, error: 'المنطقة الزمنية غير صالحة' }, { status: 400 });
      }
    }

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
      { success: false, error: 'فشل تحديث الإعدادات' },
      { status: 500 }
    );
  }
}

export const GET = withTenantScope(GETHandler);
export const PATCH = withTenantScope(PATCHHandler);

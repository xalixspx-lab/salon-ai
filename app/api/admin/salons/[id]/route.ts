import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { logAdminAction } from '@/lib/audit';
import { isPaidPlan } from '@/lib/plans';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: { owner: { select: { email: true, name: true } } },
  });
  if (!tenant) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: tenant }, { status: 200 });
}

// تعديل أي صالون بصلاحية الأدمن — بدون تقييد بـ tenantId كما هو الحال بجانب
// المالك؛ الأدمن يقدر يعدّل أي صالون على المنصة.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      name,
      city,
      addressText,
      workingHoursText,
      currency,
      timezone,
      descriptionAr,
      descriptionEn,
      phone,
      isPublished,
      isFeatured,
      depositPercentage,
      minBookingNoticeHours,
      plan,
      extendTrialDays,
    } = body;

    const current = await prisma.tenant.findUnique({ where: { id }, select: { trialEndsAt: true } });
    const existingTrialEnd = current?.trialEndsAt?.getTime() ?? 0;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(plan && (plan === 'TRIAL' || isPaidPlan(plan)) ? { plan } : {}),
        ...(Number.isInteger(extendTrialDays) && extendTrialDays > 0 && extendTrialDays <= 365
          ? { trialEndsAt: new Date(Math.max(Date.now(), existingTrialEnd) + extendTrialDays * 86400000) }
          : {}),
        ...(name ? { name } : {}),
        ...(city !== undefined ? { city: city || null } : {}),
        ...(addressText !== undefined ? { addressText: addressText || null } : {}),
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
        ...(isFeatured !== undefined ? { isFeatured: Boolean(isFeatured) } : {}),
        ...(depositPercentage !== undefined
          ? { depositPercentage: Math.max(0, Math.min(100, parseInt(depositPercentage, 10) || 0)) }
          : {}),
        ...(minBookingNoticeHours !== undefined
          ? { minBookingNoticeHours: Math.max(0, parseInt(minBookingNoticeHours, 10) || 0) }
          : {}),
      },
    });

    await logAdminAction(guard.session, {
      action: 'SALON_UPDATE',
      targetType: 'SALON',
      targetId: id,
      targetLabel: tenant.name,
      details: Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'descriptionAr' && k !== 'descriptionEn')),
    });

    return NextResponse.json({ success: true, data: tenant }, { status: 200 });
  } catch (error: any) {
    console.error('Admin error updating tenant:', error);
    return NextResponse.json(
      { success: false, error: 'فشل تحديث الصالون', details: error.message },
      { status: 500 }
    );
  }
}

// حذف صالون نهائيًا مع كل بياناته (يتتالى الحذف على الخدمات والحجوزات والعملاء…).
// حماية: يجب إرسال اسم الصالون الحالي حرفيًا في confirmName، ويُسجَّل الحذف في سجل التدقيق.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: { owner: { select: { email: true } }, _count: { select: { appointments: true, customers: true } } },
  });
  if (!tenant) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (typeof body.confirmName !== 'string' || body.confirmName.trim() !== tenant.name.trim()) {
    return NextResponse.json({ success: false, error: 'اسم الصالون غير مطابق، لم يتم الحذف' }, { status: 400 });
  }

  await logAdminAction(guard.session, {
    action: 'SALON_DELETE',
    targetType: 'SALON',
    targetId: id,
    targetLabel: tenant.name,
    details: { ownerEmail: tenant.owner?.email, appointments: tenant._count.appointments, customers: tenant._count.customers },
  });
  await prisma.tenant.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

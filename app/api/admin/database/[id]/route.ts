import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { logAdminAction } from '@/lib/audit';
import { deleteFile } from '@/lib/storage';

// تعديل/حذف مباشر من الأدمن لأي صف في الجداول التي لا تملك صفحة إدارة
// مخصصة (خدمات، موظفون، عروض، صور معرض، باقات عميل). نفس نطاق الصلاحيات
// المتاح لمالك الصالون نفسه على بياناته (لا نفتح حقولًا لا يقدر المالك تعديلها).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { id } = await params;
  const model = new URL(request.url).searchParams.get('model');
  const body = await request.json().catch(() => ({}));

  if (model === 'services') {
    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const { nameAr, nameEn, basePrice, baseDurationMinutes } = body;
    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(nameAr && nameEn ? { name: { ar: nameAr, en: nameEn } } : {}),
        ...(basePrice !== undefined ? { basePrice: basePrice ? parseFloat(basePrice) : null } : {}),
        ...(baseDurationMinutes !== undefined
          ? { baseDurationMinutes: baseDurationMinutes ? parseInt(baseDurationMinutes, 10) : null }
          : {}),
      },
    });
    await logAdminAction(guard.session, { action: 'SERVICE_UPDATE', targetType: 'SERVICE', targetId: id });
    return NextResponse.json({ success: true, data: updated });
  }

  if (model === 'staff') {
    const member = await prisma.staff.findUnique({ where: { id } });
    if (!member) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const { name, role, phone, status } = body;
    const updated = await prisma.staff.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(role !== undefined ? { role: role || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(status ? { status } : {}),
      },
    });
    await logAdminAction(guard.session, { action: 'STAFF_UPDATE', targetType: 'STAFF', targetId: id });
    return NextResponse.json({ success: true, data: updated });
  }

  if (model === 'offers') {
    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const { isActive } = body;
    const updated = await prisma.offer.update({
      where: { id },
      data: { ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}) },
    });
    await logAdminAction(guard.session, { action: 'OFFER_UPDATE', targetType: 'OFFER', targetId: id });
    return NextResponse.json({ success: true, data: updated });
  }

  if (model === 'photos') {
    const photo = await prisma.salonPhoto.findUnique({ where: { id } });
    if (!photo) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const { sortOrder } = body;
    const updated = await prisma.salonPhoto.update({
      where: { id },
      data: { ...(sortOrder !== undefined ? { sortOrder: parseInt(sortOrder, 10) || 0 } : {}) },
    });
    await logAdminAction(guard.session, { action: 'PHOTO_UPDATE', targetType: 'PHOTO', targetId: id });
    return NextResponse.json({ success: true, data: updated });
  }

  if (model === 'packages') {
    const pkg = await prisma.customerPackage.findUnique({ where: { id } });
    if (!pkg) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const { packageNameAr, packageNameEn, price, status, remainingSessions, totalSessions, expiresAt } = body;
    const updated = await prisma.customerPackage.update({
      where: { id },
      data: {
        ...(packageNameAr && packageNameEn ? { packageName: { ar: packageNameAr, en: packageNameEn } } : {}),
        ...(price !== undefined ? { price: price ? parseFloat(price) : null } : {}),
        ...(status ? { status } : {}),
        ...(remainingSessions !== undefined ? { remainingSessions: remainingSessions === '' ? null : parseInt(remainingSessions, 10) } : {}),
        ...(totalSessions !== undefined ? { totalSessions: totalSessions === '' ? null : parseInt(totalSessions, 10) } : {}),
        ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
      },
    });
    await logAdminAction(guard.session, { action: 'PACKAGE_UPDATE', targetType: 'PACKAGE', targetId: id });
    return NextResponse.json({ success: true, data: updated });
  }

  return NextResponse.json({ success: false, error: 'model must be services|staff|offers|photos|packages' }, { status: 400 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { id } = await params;
  const model = new URL(request.url).searchParams.get('model');

  if (model === 'services') {
    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    await logAdminAction(guard.session, { action: 'SERVICE_DELETE', targetType: 'SERVICE', targetId: id });
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  if (model === 'staff') {
    const member = await prisma.staff.findUnique({ where: { id } });
    if (!member) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    await logAdminAction(guard.session, { action: 'STAFF_DELETE', targetType: 'STAFF', targetId: id });
    await prisma.staff.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  if (model === 'offers') {
    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    await logAdminAction(guard.session, { action: 'OFFER_DELETE', targetType: 'OFFER', targetId: id });
    await prisma.offer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  if (model === 'photos') {
    const photo = await prisma.salonPhoto.findUnique({ where: { id } });
    if (!photo) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    await logAdminAction(guard.session, { action: 'PHOTO_DELETE', targetType: 'PHOTO', targetId: id });
    await prisma.salonPhoto.delete({ where: { id } });
    await deleteFile(photo.storagePath);
    return NextResponse.json({ success: true });
  }

  if (model === 'packages') {
    const pkg = await prisma.customerPackage.findUnique({ where: { id } });
    if (!pkg) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    await logAdminAction(guard.session, { action: 'PACKAGE_DELETE', targetType: 'PACKAGE', targetId: id });
    await prisma.customerPackage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'model must be services|staff|offers|photos|packages' }, { status: 400 });
}

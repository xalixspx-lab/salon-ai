import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { listParams } from '@/lib/adminList';

const svcName = (n: unknown) => {
  const o = (n as Record<string, string> | null) || {};
  return o.ar || o.en || '';
};
const bilingual = (n: unknown) => {
  const o = (n as Record<string, string> | null) || {};
  return { ar: o.ar || '', en: o.en || '' };
};

// عارض بيانات خام للجداول التي لا تملك صفحة إدارة مخصصة (خدمات، موظفون،
// عروض، صور معرض، باقات عميل) — للأدمن رؤية كاملة على كل بيانات المنصة.
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { q, page, take, skip } = listParams(request);
  const model = new URL(request.url).searchParams.get('model') || 'services';

  if (model === 'services') {
    const where = q ? { tenant: { name: { contains: q, mode: 'insensitive' as const } } } : {};
    const [rows, total] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { tenant: { select: { name: true } } },
      }),
      prisma.service.count({ where }),
    ]);
    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize: take,
      data: rows.map((s) => ({
        id: s.id,
        tenant: s.tenant?.name || '—',
        name: svcName(s.name) || '—',
        nameAr: bilingual(s.name).ar,
        nameEn: bilingual(s.name).en,
        basePrice: s.basePrice?.toString() ?? null,
        baseDurationMinutes: s.baseDurationMinutes,
        pricingModel: s.pricingModel,
        createdAt: s.createdAt,
      })),
    });
  }

  if (model === 'staff') {
    const where = q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { tenant: { name: { contains: q, mode: 'insensitive' as const } } }] }
      : {};
    const [rows, total] = await Promise.all([
      prisma.staff.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip, include: { tenant: { select: { name: true } } } }),
      prisma.staff.count({ where }),
    ]);
    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize: take,
      data: rows.map((s) => ({
        id: s.id,
        tenant: s.tenant?.name || '—',
        name: s.name,
        role: s.role,
        phone: s.phone,
        status: s.status,
        createdAt: s.createdAt,
      })),
    });
  }

  if (model === 'offers') {
    const where = q ? { tenant: { name: { contains: q, mode: 'insensitive' as const } } } : {};
    const [rows, total] = await Promise.all([
      prisma.offer.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip, include: { tenant: { select: { name: true } } } }),
      prisma.offer.count({ where }),
    ]);
    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize: take,
      data: rows.map((o) => ({
        id: o.id,
        tenant: o.tenant?.name || '—',
        type: o.type,
        discountPercent: o.discountPercent,
        discountAmount: o.discountAmount?.toString() ?? null,
        isActive: o.isActive,
        endsAt: o.endsAt,
        createdAt: o.createdAt,
      })),
    });
  }

  if (model === 'photos') {
    const where = q ? { tenant: { name: { contains: q, mode: 'insensitive' as const } } } : {};
    const [rows, total] = await Promise.all([
      prisma.salonPhoto.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip, include: { tenant: { select: { name: true } } } }),
      prisma.salonPhoto.count({ where }),
    ]);
    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize: take,
      data: rows.map((p) => ({ id: p.id, tenant: p.tenant?.name || '—', url: p.url, sortOrder: p.sortOrder, createdAt: p.createdAt })),
    });
  }

  if (model === 'packages') {
    const where = q
      ? { OR: [{ tenant: { name: { contains: q, mode: 'insensitive' as const } } }, { customer: { name: { contains: q, mode: 'insensitive' as const } } }] }
      : {};
    const [rows, total] = await Promise.all([
      prisma.customerPackage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { tenant: { select: { name: true } }, customer: { select: { name: true } } },
      }),
      prisma.customerPackage.count({ where }),
    ]);
    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize: take,
      data: rows.map((p) => ({
        id: p.id,
        tenant: p.tenant?.name || '—',
        customer: p.customer?.name || '—',
        packageName: svcName(p.packageName) || '—',
        packageNameAr: bilingual(p.packageName).ar,
        packageNameEn: bilingual(p.packageName).en,
        price: p.price?.toString() ?? null,
        status: p.status,
        remainingSessions: p.remainingSessions,
        totalSessions: p.totalSessions,
        expiresAt: p.expiresAt,
        createdAt: p.createdAt,
      })),
    });
  }

  // سجلات قانونية للقراءة فقط (أدلة موافقة) — لا تعديل ولا حذف
  if (model === 'agreements') {
    const [rows, total] = await Promise.all([
      prisma.tenantAgreement.findMany({ orderBy: { acceptedAt: 'desc' }, take, skip }),
      prisma.tenantAgreement.count(),
    ]);
    const tenants = await prisma.tenant.findMany({ where: { id: { in: rows.map((r) => r.tenantId) } }, select: { id: true, name: true } });
    const names = new Map(tenants.map((t) => [t.id, t.name]));
    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize: take,
      data: rows.map((r) => ({
        id: r.id,
        tenant: names.get(r.tenantId) || '(محذوف)',
        agreementVersion: r.agreementVersion,
        acceptedAt: r.acceptedAt,
        ipAddress: r.ipAddress,
      })),
    });
  }

  if (model === 'consents') {
    const [rows, total] = await Promise.all([
      prisma.consentLog.findMany({ orderBy: { recordedAt: 'desc' }, take, skip }),
      prisma.consentLog.count(),
    ]);
    const accounts = await prisma.customerAccount.findMany({ where: { id: { in: rows.map((r) => r.accountId) } }, select: { id: true, email: true } });
    const emails = new Map(accounts.map((a) => [a.id, a.email]));
    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize: take,
      data: rows.map((r) => ({
        id: r.id,
        customer: emails.get(r.accountId) || '(محذوف)',
        consentType: r.consentType,
        granted: r.granted,
        version: r.version,
        recordedAt: r.recordedAt,
        ipAddress: r.ipAddress,
      })),
    });
  }

  return NextResponse.json({ success: false, error: 'model must be services|staff|offers|photos|packages|agreements|consents' }, { status: 400 });
}

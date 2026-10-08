import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { resolveSubscription } from '@/lib/subscription';

// نظرة كاملة على صالون واحد للأدمن: المالك، الموظفون، الخدمات، الحجوزات، التقييمات
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, emailVerifiedAt: true, suspendedAt: true, createdAt: true } },
      staff: { select: { id: true, name: true, role: true, status: true }, orderBy: { createdAt: 'asc' } },
      services: { select: { id: true, name: true, basePrice: true, baseDurationMinutes: true }, orderBy: { createdAt: 'asc' } },
      _count: { select: { customers: true, appointments: true, offers: true } },
    },
  });
  if (!tenant) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const [appointments, revenue] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId: id },
      orderBy: { startTime: 'desc' },
      take: 15,
      include: { service: { select: { name: true } }, customer: { select: { name: true } }, employee: { select: { name: true } } },
    }),
    prisma.appointment.aggregate({ where: { tenantId: id, status: 'COMPLETED' }, _sum: { totalAmount: true } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        city: tenant.city,
        phone: tenant.phone,
        currency: tenant.currency,
        isPublished: tenant.isPublished,
        automationOff: tenant.automationOff,
        createdAt: tenant.createdAt,
        logoUrl: tenant.logoUrl,
        plan: tenant.plan,
        trialEndsAt: tenant.trialEndsAt,
        subscription: resolveSubscription(tenant),
      },
      owner: tenant.owner,
      staff: tenant.staff,
      services: tenant.services,
      counts: tenant._count,
      completedRevenue: revenue._sum.totalAmount ? Number(revenue._sum.totalAmount) : 0,
      appointments,
    },
  });
}

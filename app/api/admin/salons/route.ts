import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { hashPassword } from '@/lib/password';
import { generateTempPassword } from '@/lib/tempPassword';
import { logAdminAction } from '@/lib/audit';
import { getPlatformSettings } from '@/lib/platformSettings';

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 100);
  const tenants = await prisma.tenant.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { owner: { email: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {},
    orderBy: { createdAt: 'desc' },
    include: { owner: { select: { email: true, name: true } } },
  });

  return NextResponse.json({ success: true, data: tenants }, { status: 200 });
}

// إنشاء صالون + حساب مالكه مباشرة من الأدمن — بكلمة مرور مؤقتة تُعرض مرة واحدة
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const city = typeof body.city === 'string' ? body.city.trim() : '';
  const ownerName = typeof body.ownerName === 'string' ? body.ownerName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!name || !ownerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: 'اسم الصالون واسم المالك والبريد الإلكتروني الصحيح مطلوبة' }, { status: 400 });
  }
  if (await prisma.owner.findUnique({ where: { email } })) {
    return NextResponse.json({ success: false, error: 'يوجد حساب مالك بهذا البريد بالفعل' }, { status: 409 });
  }

  const tempPassword = generateTempPassword();
  const { trialDays } = await getPlatformSettings();

  const { tenant, owner } = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name, city: city || null, trialEndsAt: new Date(Date.now() + trialDays * 86400000) },
    });
    const owner = await tx.owner.create({
      data: { tenantId: tenant.id, name: ownerName, email, passwordHash: await hashPassword(tempPassword), emailVerifiedAt: new Date() },
    });
    return { tenant, owner };
  });

  await logAdminAction(guard.session, { action: 'SALON_CREATE', targetType: 'SALON', targetId: tenant.id, targetLabel: tenant.name, details: { ownerEmail: owner.email } });
  return NextResponse.json({ success: true, data: { tenant, owner: { email: owner.email } }, tempPassword }, { status: 201 });
}

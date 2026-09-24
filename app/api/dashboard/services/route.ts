import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { withTenantScope } from '@/lib/tenantScope';

async function GETHandler() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const services = await prisma.service.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, data: services }, { status: 200 });
}

async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nameAr, nameEn, basePrice, baseDurationMinutes } = body;

    if (!nameAr || !nameEn) {
      return NextResponse.json(
        { success: false, error: 'اسم الخدمة بالعربي والإنجليزي مطلوب' },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        tenantId: session.tenantId,
        name: { ar: nameAr, en: nameEn },
        basePrice: basePrice ? parseFloat(basePrice) : null,
        baseDurationMinutes: baseDurationMinutes ? parseInt(baseDurationMinutes, 10) : null,
      },
    });

    return NextResponse.json({ success: true, data: service }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { success: false, error: 'فشل إنشاء الخدمة', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withTenantScope(GETHandler);
export const POST = withTenantScope(POSTHandler);

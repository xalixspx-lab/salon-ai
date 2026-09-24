import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { withTenantScope } from '@/lib/tenantScope';

async function assertOwnedByTenant(id: string, tenantId: string) {
  const offer = await prisma.offer.findUnique({ where: { id } });
  return offer && offer.tenantId === tenantId;
}

async function PATCHHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!(await assertOwnedByTenant(id, session.tenantId))) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { isActive } = body;

    const offer = await prisma.offer.update({
      where: { id },
      data: {
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    return NextResponse.json({ success: true, data: offer }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating offer:', error);
    return NextResponse.json(
      { success: false, error: 'فشل تحديث العرض', details: error.message },
      { status: 500 }
    );
  }
}

async function DELETEHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!(await assertOwnedByTenant(id, session.tenantId))) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  await prisma.offer.delete({ where: { id } });
  return NextResponse.json({ success: true }, { status: 200 });
}

export const PATCH = withTenantScope(PATCHHandler);
export const DELETE = withTenantScope(DELETEHandler);

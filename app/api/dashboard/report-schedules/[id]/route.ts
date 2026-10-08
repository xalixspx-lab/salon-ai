import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { withTenantScope } from '@/lib/tenantScope';
import { isUuid, readJsonObject } from '@/lib/chat';
import { serializeSchedule } from '@/lib/reports/schedule';

async function PATCHHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const body = await readJsonObject(request);
  if (typeof body.isActive !== 'boolean') return NextResponse.json({ success: false, error: 'isActive required' }, { status: 400 });
  const r = await prisma.reportSchedule.updateMany({ where: { id, tenantId: session.tenantId, scope: 'OWNER' }, data: { isActive: body.isActive } });
  if (r.count === 0) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  const row = await prisma.reportSchedule.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ success: true, data: serializeSchedule(row) });
}

async function DELETEHandler(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  const r = await prisma.reportSchedule.deleteMany({ where: { id, tenantId: session.tenantId, scope: 'OWNER' } });
  if (r.count === 0) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export const PATCH = withTenantScope(PATCHHandler);
export const DELETE = withTenantScope(DELETEHandler);

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { isUuid, readJsonObject } from '@/lib/chat';
import { serializeSchedule } from '@/lib/reports/schedule';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  const body = await readJsonObject(request);
  if (typeof body.isActive !== 'boolean') return NextResponse.json({ success: false, error: 'isActive required' }, { status: 400 });
  const r = await prisma.reportSchedule.updateMany({ where: { id, scope: 'ADMIN', adminId: guard.session.adminId }, data: { isActive: body.isActive } });
  if (r.count === 0) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: serializeSchedule(await prisma.reportSchedule.findUniqueOrThrow({ where: { id } })) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  const r = await prisma.reportSchedule.deleteMany({ where: { id, scope: 'ADMIN', adminId: guard.session.adminId } });
  if (r.count === 0) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

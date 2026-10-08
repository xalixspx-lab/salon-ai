import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { isUuid, readJsonObject } from '@/lib/chat';
import { logAdminAction } from '@/lib/audit';
import { isTenantAutomationKey } from '@/lib/automations';

// تفعيل/إيقاف مهمة تلقائية لصالون واحد: { key: reports|reminders|reviews, enabled: boolean }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const body = await readJsonObject(request);
  if (!isTenantAutomationKey(body.key) || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ success: false, error: 'invalid body' }, { status: 400 });
  }
  const t = await prisma.tenant.findUnique({ where: { id }, select: { name: true, automationOff: true } });
  if (!t) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const off = new Set(t.automationOff);
  if (body.enabled) off.delete(body.key);
  else off.add(body.key);
  const automationOff = [...off].sort();
  await prisma.tenant.update({ where: { id }, data: { automationOff } });

  await logAdminAction(guard.session, {
    action: 'SALON_AUTOMATION',
    targetType: 'SALON',
    targetId: id,
    targetLabel: t.name,
    details: { key: body.key, enabled: body.enabled },
  });
  return NextResponse.json({ success: true, data: { automationOff } });
}

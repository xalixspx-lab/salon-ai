import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { readJsonObject } from '@/lib/chat';
import { limitOrResponse } from '@/lib/rateLimit';
import { isAdminType } from '@/lib/reports';
import { MAX_SCHEDULES, parseScheduleInput, serializeSchedule } from '@/lib/reports/schedule';

export const dynamic = 'force-dynamic';

// جداول المشرف الحالي فقط (كل مشرف يرى ويدير جداوله، والبريد بريده)
export async function GET() {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const rows = await prisma.reportSchedule.findMany({ where: { scope: 'ADMIN', adminId: guard.session.adminId }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ success: true, data: rows.map(serializeSchedule), max: MAX_SCHEDULES });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const limited = await limitOrResponse(`report-sched:admin:${guard.session.adminId}`, 20, 60_000);
  if (limited) return limited;

  const parsed = parseScheduleInput(await readJsonObject(request), isAdminType);
  if ('error' in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });

  const count = await prisma.reportSchedule.count({ where: { scope: 'ADMIN', adminId: guard.session.adminId } });
  if (count >= MAX_SCHEDULES) return NextResponse.json({ success: false, error: 'limit', code: 'LIMIT' }, { status: 409 });

  const row = await prisma.reportSchedule.create({
    data: { scope: 'ADMIN', adminId: guard.session.adminId, reportType: parsed.reportType, frequency: parsed.frequency, dayOfWeek: parsed.dayOfWeek, dayOfMonth: parsed.dayOfMonth, locale: parsed.locale },
  });
  return NextResponse.json({ success: true, data: serializeSchedule(row) }, { status: 201 });
}

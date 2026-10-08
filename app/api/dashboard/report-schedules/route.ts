import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { withTenantScope } from '@/lib/tenantScope';
import { readJsonObject } from '@/lib/chat';
import { limitOrResponse } from '@/lib/rateLimit';
import { isOwnerType } from '@/lib/reports';
import { MAX_SCHEDULES, parseScheduleInput, serializeSchedule } from '@/lib/reports/schedule';

export const dynamic = 'force-dynamic';

async function GETHandler() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const rows = await prisma.reportSchedule.findMany({ where: { tenantId: session.tenantId, scope: 'OWNER' }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ success: true, data: rows.map(serializeSchedule), max: MAX_SCHEDULES });
}

// جدول تقرير دوري يصل على بريد المالك نفسه فقط (لا بريد حر)
async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const limited = await limitOrResponse(`report-sched:own:${session.tenantId}`, 20, 60_000);
  if (limited) return limited;

  const parsed = parseScheduleInput(await readJsonObject(request), isOwnerType);
  if ('error' in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });

  const count = await prisma.reportSchedule.count({ where: { tenantId: session.tenantId, scope: 'OWNER' } });
  if (count >= MAX_SCHEDULES) return NextResponse.json({ success: false, error: 'limit', code: 'LIMIT' }, { status: 409 });

  const row = await prisma.reportSchedule.create({
    data: { scope: 'OWNER', tenantId: session.tenantId, reportType: parsed.reportType, frequency: parsed.frequency, dayOfWeek: parsed.dayOfWeek, dayOfMonth: parsed.dayOfMonth, locale: parsed.locale },
  });
  return NextResponse.json({ success: true, data: serializeSchedule(row) }, { status: 201 });
}

export const GET = withTenantScope(GETHandler);
export const POST = withTenantScope(POSTHandler);

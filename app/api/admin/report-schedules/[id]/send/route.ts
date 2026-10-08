import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { isUuid } from '@/lib/chat';
import { limitOrResponse } from '@/lib/rateLimit';
import { sendScheduleNow } from '@/lib/reports';
import { appOrigin } from '@/lib/email';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  const limited = await limitOrResponse(`report-send:admin:${guard.session.adminId}`, 5, 60 * 60_000);
  if (limited) return limited;

  const s = await prisma.reportSchedule.findFirst({ where: { id, scope: 'ADMIN', adminId: guard.session.adminId } });
  if (!s) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  const r = await sendScheduleNow(s, appOrigin(request));
  return NextResponse.json({ success: r === 'sent', data: { result: r } });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { withTenantScope } from '@/lib/tenantScope';
import { ownerReportsEnabled } from '@/lib/automations';
import { isUuid } from '@/lib/chat';
import { limitOrResponse } from '@/lib/rateLimit';
import { sendScheduleNow } from '@/lib/reports';
import { appOrigin } from '@/lib/email';

// "أرسل الآن": يرسل نسخة من التقرير المجدول إلى بريد المالك فورًا (للتجربة)
async function POSTHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!(await ownerReportsEnabled(session.tenantId))) return NextResponse.json({ success: false, error: 'disabled', code: 'DISABLED' }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const limited = await limitOrResponse(`report-send:own:${session.tenantId}`, 5, 60 * 60_000);
  if (limited) return limited;

  const s = await prisma.reportSchedule.findFirst({ where: { id, tenantId: session.tenantId, scope: 'OWNER' } });
  if (!s) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  const r = await sendScheduleNow(s, appOrigin(request));
  return NextResponse.json({ success: r === 'sent', data: { result: r } });
}

export const POST = withTenantScope(POSTHandler);

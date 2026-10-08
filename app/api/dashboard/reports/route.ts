import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { withTenantScope } from '@/lib/tenantScope';
import { limitOrResponse } from '@/lib/rateLimit';
import { reportToCsv } from '@/lib/reports/csv';
import { generateOwnerReport, isOwnerType, normLang, tenantTimezone } from '@/lib/reports';
import { resolveRange } from '@/lib/reports/range';

export const dynamic = 'force-dynamic';

// تقرير حسب الطلب لصاحب الصالون: ?type=&preset=|from=&to=&lang=&format=json|csv
async function GETHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const limited = await limitOrResponse(`reports:own:${session.tenantId}`, 30, 60_000);
  if (limited) return limited;

  const q = new URL(request.url).searchParams;
  const lang = normLang(q.get('lang'));
  const type = q.get('type') ?? 'overview';
  if (!isOwnerType(type)) return NextResponse.json({ success: false, error: 'invalid type' }, { status: 400 });

  const tz = await tenantTimezone(session.tenantId);
  const range = resolveRange({ preset: q.get('preset') ?? (q.get('from') ? 'custom' : 'last30'), from: q.get('from'), to: q.get('to') }, tz, lang);
  if ('error' in range) return NextResponse.json({ success: false, error: range.error }, { status: 400 });

  const report = await generateOwnerReport(session.tenantId, type, range, lang);

  if (q.get('format') === 'csv') {
    const name = `salon-${type}-${range.fromYmd}_${range.toYmdInclusive}.csv`;
    return new NextResponse(reportToCsv(report), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${name}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }
  return NextResponse.json({ success: true, data: report }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export const GET = withTenantScope(GETHandler);

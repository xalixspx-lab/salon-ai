import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminSession';
import { limitOrResponse } from '@/lib/rateLimit';
import { reportToCsv } from '@/lib/reports/csv';
import { ADMIN_TZ, generateAdminReport, isAdminType, normLang } from '@/lib/reports';
import { resolveRange } from '@/lib/reports/range';

export const dynamic = 'force-dynamic';

// تقرير المنصة حسب الطلب للمشرف: ?type=&preset=|from=&to=&lang=&format=json|csv
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const limited = await limitOrResponse(`reports:admin:${guard.session.adminId}`, 20, 60_000);
  if (limited) return limited;

  const q = new URL(request.url).searchParams;
  const lang = normLang(q.get('lang'));
  const type = q.get('type') ?? 'overview';
  if (!isAdminType(type)) return NextResponse.json({ success: false, error: 'invalid type' }, { status: 400 });

  const range = resolveRange({ preset: q.get('preset') ?? (q.get('from') ? 'custom' : 'last30'), from: q.get('from'), to: q.get('to') }, ADMIN_TZ, lang);
  if ('error' in range) return NextResponse.json({ success: false, error: range.error }, { status: 400 });

  const report = await generateAdminReport(type, range, lang);

  if (q.get('format') === 'csv') {
    const name = `platform-${type}-${range.fromYmd}_${range.toYmdInclusive}.csv`;
    return new NextResponse(reportToCsv(report), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'private, no-store' },
    });
  }
  return NextResponse.json({ success: true, data: report }, { headers: { 'Cache-Control': 'private, no-store' } });
}

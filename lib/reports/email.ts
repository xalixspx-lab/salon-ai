import { reportToCsv } from '@/lib/reports/csv';
import { ctxOf, formatCell } from '@/lib/reports/format';
import type { Report } from '@/lib/reports/types';

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// بريد التقرير: ملخص المؤشرات + أول صفوف أهم الأقسام + ملف CSV كامل مرفق.
// كل نص يأتي من بيانات المستخدمين يُهرَّب (esc) لأن البريد يُعرض كـHTML.
export function renderReportEmail(report: Report, opts: { link?: string }) {
  const ctx = ctxOf(report);
  const en = report.lang === 'en';
  const dir = en ? 'ltr' : 'rtl';
  const subject = `${report.title} — ${report.period.label}`;

  const kpiHtml = report.kpis
    .map(
      (k) =>
        `<td style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;vertical-align:top"><div style="font-size:11px;color:#6b7280">${esc(k.label)}</div><div style="font-size:18px;font-weight:700;color:#6b2340">${esc(formatCell(k.value, k.kind, ctx))}</div>${k.hint ? `<div style="font-size:10px;color:#9ca3af">${esc(k.hint)}</div>` : ''}</td>`
    )
    .reduce<string[][]>((rows, cell, i) => {
      if (i % 3 === 0) rows.push([]);
      rows[rows.length - 1].push(cell);
      return rows;
    }, [])
    .map((r) => `<tr>${r.join('')}</tr>`)
    .join('');

  const sectionsHtml = report.sections
    .slice(0, 3)
    .map((s) => {
      const head = s.columns.map((c) => `<th style="padding:4px 8px;border-bottom:2px solid #b4456b;text-align:${en ? 'left' : 'right'};font-size:12px">${esc(c.label)}</th>`).join('');
      const body = s.rows
        .slice(0, 8)
        .map((r) => `<tr>${s.columns.map((c) => `<td style="padding:4px 8px;border-bottom:1px solid #f3f4f6;font-size:12px">${esc(formatCell(r[c.key] ?? null, c.kind, ctx))}</td>`).join('')}</tr>`)
        .join('');
      return `<h3 style="margin:16px 0 4px;color:#8a2f50;font-size:14px">${esc(s.title)}</h3><table style="border-collapse:collapse;width:100%"><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td style="padding:6px;color:#9ca3af">—</td></tr>`}</tbody></table>`;
    })
    .join('');

  const html = `<div dir="${dir}" style="font-family:Segoe UI,Tahoma,Arial,sans-serif;max-width:680px;margin:auto">
<h2 style="color:#6b2340;margin-bottom:2px">${esc(report.title)}</h2>
<p style="color:#6b7280;margin-top:0">${esc(report.period.label)}</p>
<table style="border-collapse:separate;border-spacing:6px;width:100%">${kpiHtml}</table>
${sectionsHtml}
<p style="margin-top:16px;color:#6b7280;font-size:12px">${en ? 'The full report is attached as a CSV file.' : 'التقرير الكامل مرفق بصيغة CSV.'}${opts.link ? ` <a href="${esc(opts.link)}">${en ? 'Open in the platform' : 'افتح في المنصة'}</a>` : ''}</p>
</div>`;

  const text = [subject, '', ...report.kpis.map((k) => `${k.label}: ${formatCell(k.value, k.kind, ctx)}`), '', en ? 'Full report attached (CSV).' : 'التقرير الكامل مرفق (CSV).', opts.link ?? ''].join('\n');
  const filename = `${report.scope === 'ADMIN' ? 'platform' : 'salon'}-${report.type}-${report.period.label.replace(/[^0-9a-zA-Z]+/g, '_')}.csv`;
  return { subject, html, text, attachments: [{ filename, content: reportToCsv(report) }] };
}

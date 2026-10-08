'use client';

import { ctxOf, formatCell } from '@/lib/reports/format';
import type { Report, Section } from '@/lib/reports/types';

function BarChart({ section, report }: { section: Section; report: Report }) {
  if (!section.chart) return null;
  const { labelKey, valueKey } = section.chart;
  const col = section.columns.find((c) => c.key === valueKey);
  const rows = section.rows.slice(0, 40);
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  const ctx = ctxOf(report);
  if (rows.length === 0) return null;
  return (
    <div className="mb-3 space-y-1.5" role="img" aria-label={section.title}>
      {rows.map((r, i) => {
        const v = Number(r[valueKey]) || 0;
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate text-stone-500" title={String(r[labelKey] ?? '')}>
              {String(r[labelKey] ?? '').slice(-24)}
            </span>
            <div className="flex-1 h-3 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.max(2, (v / max) * 100)}%` }} />
            </div>
            <span className="w-24 shrink-0 text-end tabular-nums text-stone-700">{formatCell(v, col?.kind, ctx)}</span>
          </div>
        );
      })}
    </div>
  );
}

// عارض تقرير عام: مؤشرات + أقسام (مخطط اختياري + جدول). يدعم الطباعة/الحفظ كـPDF عبر print-area.
export default function ReportView({ report }: { report: Report }) {
  const ctx = ctxOf(report);
  const en = report.lang === 'en';
  const generated = new Intl.DateTimeFormat('sv-SE', { timeZone: report.tz, dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.generatedAt));

  return (
    <article className="print-area bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6" dir={en ? 'ltr' : 'rtl'}>
      <header className="mb-4 pb-3 border-b border-stone-100">
        <h2 className="text-xl font-bold text-stone-900">{report.title}</h2>
        <p className="text-sm text-stone-500 mt-0.5">
          {report.period.label} · <span className="text-xs">{en ? 'Generated' : 'أُنشئ'} {generated}</span>
        </p>
      </header>

      {report.kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {report.kpis.map((k) => (
            <div key={k.id} className="rounded-xl border border-stone-200 p-3 bg-stone-50/60 break-inside-avoid">
              <p className="text-xs text-stone-500">{k.label}</p>
              <p className="text-xl font-bold text-brand-700 mt-0.5 tabular-nums">{formatCell(k.value, k.kind, ctx)}</p>
              {k.hint && <p className="text-[11px] text-stone-400 mt-0.5">{k.hint}</p>}
            </div>
          ))}
        </div>
      )}

      {report.sections.map((s) => (
        <section key={s.id} className="mb-8 break-inside-avoid-page">
          <h3 className="text-base font-bold text-stone-800 mb-2">{s.title}</h3>
          <BarChart section={s} report={report} />
          {s.rows.length === 0 ? (
            <p className="text-sm text-stone-400 py-4">{en ? 'No data for this period.' : 'لا توجد بيانات في هذه الفترة.'}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-600">
                  <tr>
                    {s.columns.map((c) => (
                      <th key={c.key} className="px-3 py-2 text-start font-semibold whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map((r, i) => (
                    <tr key={i} className="border-t border-stone-100">
                      {s.columns.map((c) => (
                        <td key={c.key} className={`px-3 py-2 ${c.kind && c.kind !== 'text' ? 'tabular-nums whitespace-nowrap' : ''}`}>
                          {formatCell(r[c.key] ?? null, c.kind, ctx)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {s.note && <p className="text-xs text-stone-400 mt-1.5">{s.note}</p>}
        </section>
      ))}
    </article>
  );
}

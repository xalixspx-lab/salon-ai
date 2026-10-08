import { ctxOf, formatCell } from '@/lib/reports/format';
import type { Cell, ColKind, Report } from '@/lib/reports/types';

// CSV متوافق مع Excel: BOM لـUTF-8 (يعرض العربية صحيحة)، فاصلة، اقتباس مزدوج.
// ضد حقن الصيغ (CSV injection): أي نص يبدأ بـ = + - @ أو Tab/CR يُسبق بفاصلة عليا،
// لأن أسماء العملاء والخدمات يكتبها المستخدمون وتُفتح في Excel عند المالك/المشرف.
export function sanitizeCsvText(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function csvCell(value: Cell, kind: ColKind | undefined, ctx: ReturnType<typeof ctxOf>): string {
  let out: string;
  if (value === null || value === undefined || value === '') out = '';
  else if (kind === 'money' && typeof value === 'number') out = value.toFixed(3);
  else if (kind === 'percent' && typeof value === 'number') out = String(Math.round(value * 10) / 10);
  else if (kind === 'int' && typeof value === 'number') out = String(value);
  else if (kind === 'minutes' && typeof value === 'number') out = String(Math.round(value));
  else if (kind === 'date' || kind === 'datetime') out = formatCell(value, kind, ctx);
  else out = sanitizeCsvText(String(value));
  return /[",\n\r]/.test(out) ? `"${out.replace(/"/g, '""')}"` : out;
}

const line = (cells: string[]) => cells.join(',');

export function reportToCsv(report: Report): string {
  const ctx = ctxOf(report);
  const out: string[] = [];
  out.push(line([csvCell(report.title, 'text', ctx)]));
  out.push(line([csvCell(report.period.label, 'text', ctx)]));
  out.push('');
  if (report.kpis.length) {
    for (const k of report.kpis) out.push(line([csvCell(k.label, 'text', ctx), csvCell(k.value, k.kind, ctx)]));
    out.push('');
  }
  for (const s of report.sections) {
    out.push(line([csvCell(s.title, 'text', ctx)]));
    out.push(line(s.columns.map((c) => csvCell(c.label, 'text', ctx))));
    for (const r of s.rows) out.push(line(s.columns.map((c) => csvCell(r[c.key] ?? null, c.kind, ctx))));
    if (s.truncated) out.push(csvCell(s.note ?? '…', 'text', ctx));
    out.push('');
  }
  return '﻿' + out.join('\r\n') + '\r\n';
}

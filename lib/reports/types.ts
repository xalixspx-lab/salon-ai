// بنية تقرير عامة: كل التقارير (مالك/مشرف) تُنتَج بهذا الشكل، ومنه تُرسَم الشاشة والـCSV والبريد.
export type Lang = 'ar' | 'en';
export type ColKind = 'text' | 'int' | 'money' | 'percent' | 'date' | 'datetime' | 'minutes';
export type Cell = string | number | null;
export type Row = Record<string, Cell>;

export type Col = { key: string; label: string; kind?: ColKind };

export type Section = {
  id: string;
  title: string;
  columns: Col[];
  rows: Row[];
  // مخطط أعمدة بسيط فوق الجدول (قيمة رقمية لكل تسمية)
  chart?: { labelKey: string; valueKey: string };
  note?: string;
  truncated?: boolean;
};

export type Kpi = { id: string; label: string; value: Cell; kind: ColKind; hint?: string };

export type Report = {
  type: string;
  scope: 'OWNER' | 'ADMIN';
  title: string;
  lang: Lang;
  tz: string;
  currency: string;
  period: { from: string; to: string; label: string };
  generatedAt: string;
  kpis: Kpi[];
  sections: Section[];
};

export const OWNER_REPORT_TYPES = ['overview', 'bookings', 'revenue', 'services', 'staff', 'clients', 'messages'] as const;
export const ADMIN_REPORT_TYPES = ['overview', 'salons', 'bookings', 'subscriptions', 'activity'] as const;
export type OwnerReportType = (typeof OWNER_REPORT_TYPES)[number];
export type AdminReportType = (typeof ADMIN_REPORT_TYPES)[number];

export const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const MAX_ROWS = 2000;

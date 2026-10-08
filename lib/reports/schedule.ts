import { FREQUENCIES, type Frequency } from '@/lib/reports/types';

export const MAX_SCHEDULES = 5;

export type ScheduleInput = { reportType: string; frequency: Frequency; dayOfWeek: number | null; dayOfMonth: number | null; locale: 'ar' | 'en' };

// يتحقق من جسم إنشاء جدول. dayOfMonth حتى 28 كي يعمل في كل الشهور.
export function parseScheduleInput(body: Record<string, unknown>, isValidType: (v: unknown) => boolean): ScheduleInput | { error: string } {
  const frequency = body.frequency;
  if (typeof frequency !== 'string' || !(FREQUENCIES as readonly string[]).includes(frequency)) return { error: 'invalid frequency' };
  if (!isValidType(body.reportType)) return { error: 'invalid report type' };

  let dayOfWeek: number | null = null;
  let dayOfMonth: number | null = null;
  if (frequency === 'WEEKLY') {
    const d = Number(body.dayOfWeek);
    if (!Number.isInteger(d) || d < 0 || d > 6) return { error: 'invalid day of week' };
    dayOfWeek = d;
  }
  if (frequency === 'MONTHLY') {
    const d = Number(body.dayOfMonth);
    if (!Number.isInteger(d) || d < 1 || d > 28) return { error: 'invalid day of month' };
    dayOfMonth = d;
  }
  return {
    reportType: body.reportType as string,
    frequency: frequency as Frequency,
    dayOfWeek,
    dayOfMonth,
    locale: body.locale === 'en' ? 'en' : 'ar',
  };
}

type Row = { id: string; reportType: string; frequency: string; dayOfWeek: number | null; dayOfMonth: number | null; locale: string; isActive: boolean; lastRunAt: Date | null; lastError: string | null };
export const serializeSchedule = (s: Row) => ({
  id: s.id,
  reportType: s.reportType,
  frequency: s.frequency,
  dayOfWeek: s.dayOfWeek,
  dayOfMonth: s.dayOfMonth,
  locale: s.locale,
  isActive: s.isActive,
  lastRunAt: s.lastRunAt?.toISOString() ?? null,
  lastError: s.lastError,
});

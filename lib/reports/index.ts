import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { buildAdminReport } from '@/lib/reports/admin';
import { renderReportEmail } from '@/lib/reports/email';
import { buildOwnerReport } from '@/lib/reports/owner';
import { isScheduleDue, periodForSchedule, resolveRange, type Range } from '@/lib/reports/range';
import { localParts, zonedToUtc } from '@/lib/schedule';
import {
  ADMIN_REPORT_TYPES,
  OWNER_REPORT_TYPES,
  type AdminReportType,
  type Frequency,
  type Lang,
  type OwnerReportType,
  type Report,
} from '@/lib/reports/types';

export const ADMIN_TZ = 'Asia/Bahrain';

export const isOwnerType = (v: unknown): v is OwnerReportType => typeof v === 'string' && (OWNER_REPORT_TYPES as readonly string[]).includes(v);
export const isAdminType = (v: unknown): v is AdminReportType => typeof v === 'string' && (ADMIN_REPORT_TYPES as readonly string[]).includes(v);
export const normLang = (v: unknown): Lang => (v === 'en' ? 'en' : 'ar');

export async function tenantTimezone(tenantId: string): Promise<string> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { timezone: true } });
  return t?.timezone || ADMIN_TZ;
}

export async function generateOwnerReport(tenantId: string, type: OwnerReportType, range: Range, lang: Lang): Promise<Report> {
  return buildOwnerReport({ tenantId, type, from: range.from, to: range.to, periodLabel: range.label, lang });
}
export async function generateAdminReport(type: AdminReportType, range: Range, lang: Lang): Promise<Report> {
  return buildAdminReport({ type, from: range.from, to: range.to, periodLabel: range.label, lang });
}

type Schedule = {
  id: string;
  scope: string;
  tenantId: string | null;
  adminId: string | null;
  reportType: string;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  locale: string;
  lastRunAt: Date | null;
};

// يبني التقرير الدوري لجدول ويرسله لصاحبه (بريد المالك/المشرف الحالي فقط)
async function deliver(s: Schedule, origin: string | undefined): Promise<'sent' | 'skipped'> {
  const lang = normLang(s.locale);
  const freq = s.frequency as Frequency;
  let to: string | null = null;
  let report: Report;
  let link: string | undefined;

  if (s.scope === 'OWNER' && s.tenantId && isOwnerType(s.reportType)) {
    const owner = await prisma.owner.findUnique({ where: { tenantId: s.tenantId }, select: { email: true, suspendedAt: true } });
    if (!owner || owner.suspendedAt) return 'skipped';
    to = owner.email;
    const tz = await tenantTimezone(s.tenantId);
    report = await generateOwnerReport(s.tenantId, s.reportType, periodForSchedule(freq, tz, lang), lang);
    link = origin ? `${origin}/${lang}/dashboard/reports` : undefined;
  } else if (s.scope === 'ADMIN' && s.adminId && isAdminType(s.reportType)) {
    const admin = await prisma.admin.findUnique({ where: { id: s.adminId }, select: { email: true } });
    if (!admin) return 'skipped';
    to = admin.email;
    report = await generateAdminReport(s.reportType, periodForSchedule(freq, ADMIN_TZ, lang), lang);
    link = origin ? `${origin}/${lang}/admin/reports` : undefined;
  } else return 'skipped';

  const mail = renderReportEmail(report, { link });
  await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text, attachments: mail.attachments });
  return 'sent';
}

export async function sendScheduleNow(s: Schedule, origin?: string) {
  return deliver(s, origin);
}

// يُشغَّل يوميًا من cron: لكل جدول فعّال حان موعده (بتوقيت صاحبه) يُحجز اليوم أولًا بتحديث
// مشروط (فلا يُرسَل مرتين لو تداخل تشغيلان) ثم يُرسَل. فشل جدول لا يوقف البقية.
export async function runDueReports(now = new Date(), origin?: string) {
  const schedules = await prisma.reportSchedule.findMany({ where: { isActive: true }, take: 1000 });
  const tzCache = new Map<string, string>();
  let due = 0;
  let sent = 0;
  let failed = 0;

  for (const s of schedules) {
    try {
      const tz = s.scope === 'OWNER' && s.tenantId ? (tzCache.get(s.tenantId) ?? (await tenantTimezone(s.tenantId))) : ADMIN_TZ;
      if (s.scope === 'OWNER' && s.tenantId) tzCache.set(s.tenantId, tz);
      if (!isScheduleDue(s, tz, now)) continue;
      due++;

      const startOfDay = zonedToUtc(localParts(now, tz).dateStr, '00:00', tz);
      const claimed = await prisma.reportSchedule.updateMany({
        where: { id: s.id, OR: [{ lastRunAt: null }, { lastRunAt: { lt: startOfDay } }] },
        data: { lastRunAt: now },
      });
      if (claimed.count !== 1) continue;

      const r = await deliver(s, origin);
      if (r === 'sent') sent++;
      await prisma.reportSchedule.update({ where: { id: s.id }, data: { lastError: r === 'skipped' ? 'skipped: recipient unavailable' : null } });
    } catch (e) {
      failed++;
      console.error('report schedule failed:', s.id, e);
      await prisma.reportSchedule
        .update({ where: { id: s.id }, data: { lastError: (e instanceof Error ? e.message : 'error').slice(0, 300) } })
        .catch(() => {});
    }
  }
  return { schedules: schedules.length, due, sent, failed };
}

export { resolveRange };

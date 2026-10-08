import { prisma } from '@/lib/prisma';
import { automationEnabled } from '@/lib/automations';
import { formatDateTime } from '@/lib/format';
import { recordOutboundTemplate, sendWhatsAppTemplate } from '@/lib/whatsapp';
import { toWaNumber } from '@/lib/whatsappCore';
import { reminderParams, reminderPreview, TEMPLATES, winBackParams, winBackPreview, WIN_BACK_AFTER_DAYS, WIN_BACK_DAILY_CAP } from '@/lib/whatsappTemplates';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const validPhone = (p: string | null) => toWaNumber(p);

// تذكير بالمواعيد المؤكدة التي تبدأ بعد 12–36 ساعة، عبر واتساب الصالون إلى رقم العميل (قالب معتمد).
// تُحجز علامة reminderSentAt قبل الإرسال بتحديث مشروط فلا يتكرر الإرسال لو تداخل تشغيلان،
// وتُعاد للفراغ إن فشل الإرسال ليُعاد المحاولة في التشغيل التالي (ما دام الموعد ضمن النافذة).
// يتخطى: صالونًا بلا رقم واتساب مربوط، أو أوقف الأدمن تذكيراته، أو عميلًا بلا رقم صالح.
export async function sendAppointmentReminders(now = new Date()) {
  if (!(await automationEnabled('reminders'))) return { due: 0, sent: 0, disabled: true };

  const due = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED',
      reminderSentAt: null,
      startTime: { gte: new Date(now.getTime() + 12 * HOUR), lt: new Date(now.getTime() + 36 * HOUR) },
      customer: { phone: { not: null } },
      tenant: { NOT: { automationOff: { has: 'reminders' } }, whatsappAccount: { is: { status: 'ACTIVE' } } },
    },
    orderBy: { startTime: 'asc' },
    take: 500,
    select: { id: true, tenantId: true, startTime: true, customer: { select: { id: true, name: true, phone: true } }, tenant: { select: { name: true, timezone: true } } },
  });

  let sent = 0;
  let failed = 0;
  for (const a of due) {
    const to = validPhone(a.customer?.phone ?? null);
    const tenantId = a.tenantId;
    if (!to || !a.startTime || !tenantId) continue;
    const claimed = await prisma.appointment.updateMany({ where: { id: a.id, reminderSentAt: null }, data: { reminderSentAt: new Date() } });
    if (claimed.count !== 1) continue;

    const params = reminderParams(a.customer?.name ?? '', a.tenant?.name ?? '', formatDateTime(a.startTime, 'ar', a.tenant?.timezone));
    const r = await sendWhatsAppTemplate(tenantId, to, TEMPLATES.reminder(), TEMPLATES.lang(), params);
    if (!r.ok) {
      failed++;
      await prisma.appointment.updateMany({ where: { id: a.id }, data: { reminderSentAt: null } });
      continue;
    }
    sent++;
    await recordOutboundTemplate(tenantId, to, a.customer?.id ?? null, 'reminder', reminderPreview(params), r.waMessageId).catch((e) => console.error('record reminder failed', e));
  }
  return { due: due.length, sent, failed };
}

// «اشتقنا لك» (تسويقي): لكل صالون مربوط بواتساب وغير موقوف له، عملاء راسلوه سابقًا على واتساب (دليل موافقة)
// ولهم زيارة مكتملة وآخر موعد لهم قبل أكثر من 45 يومًا، ولم يصلهم القالب نفسه خلال المدة ذاتها.
// حد يومي لكل صالون. يعمل فقط إن فعّله الأدمن من إعدادات المنصة (الافتراضي: متوقف).
export async function sendWinBackMessages(now = new Date()) {
  if (!(await automationEnabled('winBack'))) return { sent: 0, disabled: true };

  const cutoff = new Date(now.getTime() - WIN_BACK_AFTER_DAYS * DAY);
  const tenants = await prisma.tenant.findMany({
    where: { NOT: { automationOff: { has: 'winBack' } }, whatsappAccount: { is: { status: 'ACTIVE' } } },
    select: { id: true, name: true },
    take: 500,
  });

  let sent = 0;
  for (const t of tenants) {
    const [lastAny, completed] = await Promise.all([
      prisma.appointment.groupBy({ by: ['customerId'], where: { tenantId: t.id, customerId: { not: null } }, _max: { startTime: true } }),
      prisma.appointment.groupBy({ by: ['customerId'], where: { tenantId: t.id, customerId: { not: null }, status: 'COMPLETED' }, _count: { _all: true } }),
    ]);
    const completedIds = new Set(completed.map((c) => c.customerId));
    const lapsedIds = lastAny.filter((r) => r.customerId && completedIds.has(r.customerId) && r._max.startTime && r._max.startTime < cutoff).map((r) => r.customerId as string);
    if (lapsedIds.length === 0) continue;

    const candidates = await prisma.contact.findMany({
      where: { tenantId: t.id, customerId: { in: lapsedIds }, lastInboundAt: { not: null } },
      select: { id: true, phone: true, name: true, customerId: true, customer: { select: { name: true } } },
      take: 200,
    });

    let sentForTenant = 0;
    for (const c of candidates) {
      if (sentForTenant >= WIN_BACK_DAILY_CAP) break;
      const already = await prisma.message.count({
        where: { tenantId: t.id, msgType: 'template:winback', createdAt: { gte: cutoff }, conversation: { contactId: c.id } },
      });
      if (already > 0) continue;
      const params = winBackParams(c.customer?.name || c.name || '', t.name);
      const r = await sendWhatsAppTemplate(t.id, c.phone, TEMPLATES.winBack(), TEMPLATES.lang(), params);
      if (!r.ok) continue;
      await recordOutboundTemplate(t.id, c.phone, c.customerId, 'winback', winBackPreview(params), r.waMessageId).catch((e) => console.error('record winback failed', e));
      sentForTenant++;
      sent++;
    }
  }
  return { sent };
}

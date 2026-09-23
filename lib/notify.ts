import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { DEFAULT_TIMEZONE } from '@/lib/schedule';

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type BookingEvent = 'created' | 'cancelled' | 'rescheduled' | 'confirmed' | 'completed';
type Recipient = 'customer' | 'owner';

const SUBJECT: Record<BookingEvent, { ar: string; en: string }> = {
  created: { ar: 'حجز جديد', en: 'New booking' },
  cancelled: { ar: 'تم إلغاء حجز', en: 'Booking cancelled' },
  rescheduled: { ar: 'تم تغيير موعد حجز', en: 'Booking rescheduled' },
  confirmed: { ar: 'تم تأكيد حجزك', en: 'Your booking is confirmed' },
  completed: { ar: 'شكرًا لزيارتك', en: 'Thanks for your visit' },
};

// إشعار بريدي ثنائي اللغة. الفشل لا يوقف العملية الأساسية أبدًا.
export async function notifyBooking(appointmentId: string, event: BookingEvent, to: Recipient[]) {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: { select: { name: true } },
        employee: { select: { name: true } },
        customer: { include: { account: { select: { email: true, name: true } } } },
        tenant: { include: { owner: { select: { email: true } } } },
      },
    });
    if (!appt || !appt.tenant || !appt.startTime) return;

    const tz = appt.tenant.timezone || DEFAULT_TIMEZONE;
    const when = (locale: 'ar-BH' | 'en-GB') =>
      appt.startTime!.toLocaleString(locale, { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' });
    const svcName = (appt.service?.name as Record<string, string> | null) || {};
    const service = { ar: svcName.ar || svcName.en || '', en: svcName.en || svcName.ar || '' };
    const salon = appt.tenant.name;
    const customerName = appt.customer?.name || '—';

    const recipients: Array<{ email: string; who: Recipient }> = [];
    if (to.includes('customer') && appt.customer?.account?.email) {
      recipients.push({ email: appt.customer.account.email, who: 'customer' });
    }
    if (to.includes('owner') && appt.tenant.owner?.email) {
      recipients.push({ email: appt.tenant.owner.email, who: 'owner' });
    }

    const appOrigin = process.env.APP_URL?.replace(/\/$/, '');
    const accountLink = appOrigin ? `${appOrigin}/ar/account` : null;

    for (const r of recipients) {
      const subject = `${SUBJECT[event].ar} — ${salon} | ${SUBJECT[event].en}`;
      const lines = [
        `${salon}`,
        `${service.ar} / ${service.en}`,
        `${when('ar-BH')}  |  ${when('en-GB')}`,
        r.who === 'owner' ? `العميل / Customer: ${customerName}` : '',
        appt.employee?.name ? `الموظف / Staff: ${appt.employee.name}` : '',
        event === 'completed' && r.who === 'customer' ? 'حصلت على 10 نقاط ولاء لهذه الزيارة! / You earned 10 loyalty points for this visit!' : '',
        event === 'completed' && r.who === 'customer' && accountLink ? `قيّم زيارتك / Rate your visit: ${accountLink}` : '',
      ].filter(Boolean);
      const text = `${SUBJECT[event].ar} | ${SUBJECT[event].en}\n\n${lines.join('\n')}`;
      const html = `<div style="font-family:sans-serif"><h3>${SUBJECT[event].ar} | ${SUBJECT[event].en}</h3>${lines
        .map((l) => `<p style="margin:4px 0">${esc(l)}</p>`)
        .join('')}</div>`;
      await sendEmail({ to: r.email, subject, text, html });
    }
  } catch (error) {
    console.error('notifyBooking failed:', error);
  }
}

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { CONSENT_TYPES, currentConsent } from '@/lib/legal';
import { automationEnabled } from '@/lib/automations';

const DAY = 24 * 3600 * 1000;
export const WIN_BACK_AFTER_DAYS = 45;
export const REVIEW_REQUEST_MIN_DAYS = 2;
export const REVIEW_REQUEST_MAX_DAYS = 3;

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function shell(body: string) {
  return `<div dir="rtl" style="font-family:sans-serif;line-height:1.7">${body}</div>`;
}

function button(href: string, label: string) {
  return `<p><a href="${href}" style="background:#111;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none">${esc(label)}</a></p>`;
}

// طلب تقييم: لكل زيارة اكتملت قبل 2–3 أيام بلا تقييم. النافذة الزمنية (يوم واحد)
// مع مهمة يومية تعني رسالة واحدة فقط لكل زيارة دون حاجة لحقل تتبّع إضافي.
// رسالة خدمية عن زيارة فعلية، فلا تشترط موافقة التسويق.
export async function sendReviewRequests(appOrigin: string): Promise<number> {
  if (!(await automationEnabled('reviews'))) return 0;
  const now = Date.now();
  const appts = await prisma.appointment.findMany({
    where: {
      status: 'COMPLETED',
      startTime: {
        gte: new Date(now - REVIEW_REQUEST_MAX_DAYS * DAY - DAY),
        lt: new Date(now - REVIEW_REQUEST_MIN_DAYS * DAY),
      },
      review: null,
      tenant: { NOT: { automationOff: { has: 'reviews' } } },
      customer: { accountId: { not: null } },
    },
    include: { tenant: { select: { name: true } }, customer: { include: { account: { select: { email: true, suspendedAt: true } } } } },
    take: 200,
  });

  let sent = 0;
  for (const a of appts) {
    const acct = a.customer?.account;
    if (!acct?.email || acct.suspendedAt) continue;
    const salon = a.tenant?.name || 'Salon AI';
    const link = `${appOrigin}/ar/account`;
    await sendEmail({
      to: acct.email,
      subject: `كيف كانت زيارتك لـ ${salon}؟ | How was your visit to ${salon}?`,
      text: `شكرًا لزيارتك ${salon}. رأيك يساعد غيرك على الاختيار — قيّم زيارتك: ${link}\n\nThanks for visiting ${salon}. Your review helps others choose: ${link}`,
      html: shell(
        `<p>شكرًا لزيارتك <b>${esc(salon)}</b> 💜</p><p>رأيك يساعد غيرك على الاختيار، ويأخذ أقل من دقيقة.</p>${button(link, 'قيّم زيارتك')}` +
          `<p style="color:#888;font-size:13px" dir="ltr">Thanks for visiting ${esc(salon)}. Your review helps others choose.</p>`
      ),
    });
    sent++;
  }
  return sent;
}

// "اشتقنا لك": لحسابات مضى على آخر حجز لها WIN_BACK_AFTER_DAYS وأكثر (أو بلا حجوزات
// وعمر الحساب أطول من ذلك)، وأعطت موافقة تسويق سارية، ولم تصلها رسالة مماثلة
// خلال المدة نفسها. رسالة تسويقية فتُشترط موافقة MARKETING (قانون حماية البيانات).
export async function sendWinBackEmails(appOrigin: string): Promise<number> {
  if (!(await automationEnabled('winBack'))) return 0;
  const cutoff = new Date(Date.now() - WIN_BACK_AFTER_DAYS * DAY);
  const candidates = await prisma.customerAccount.findMany({
    where: {
      suspendedAt: null,
      createdAt: { lt: cutoff },
      OR: [{ lastMarketingEmailAt: null }, { lastMarketingEmailAt: { lt: cutoff } }],
    },
    select: { id: true, name: true, email: true, customers: { select: { id: true } } },
    take: 200,
  });

  let sent = 0;
  for (const c of candidates) {
    const consent = await currentConsent(c.id, CONSENT_TYPES.MARKETING);
    if (!consent?.granted) continue;

    const recent = await prisma.appointment.count({
      where: { customerId: { in: c.customers.map((x) => x.id) }, startTime: { gte: cutoff } },
    });
    if (recent > 0) continue;

    const link = `${appOrigin}/ar/salons`;
    await sendEmail({
      to: c.email,
      subject: 'اشتقنا لك في Salon AI | We miss you',
      text: `أهلًا ${c.name}، مضى وقت على آخر زيارة. اكتشف العروض الجديدة: ${link}\n\nHi ${c.name}, it's been a while. See what's new: ${link}`,
      html: shell(
        `<p>أهلًا ${esc(c.name)} 👋</p><p>مضى وقت على آخر زيارة لك. صالونات جديدة وعروض بانتظارك، ونقاط ولائك محفوظة.</p>${button(link, 'اكتشف الصالونات')}` +
          `<p style="color:#888;font-size:13px" dir="ltr">Hi ${esc(c.name)}, it's been a while — new salons and offers are waiting.</p>` +
          `<p style="color:#aaa;font-size:12px">يمكنك إيقاف هذه الرسائل من حسابك ← الخصوصية.</p>`
      ),
    });
    await prisma.customerAccount.update({ where: { id: c.id }, data: { lastMarketingEmailAt: new Date() } });
    sent++;
  }
  return sent;
}

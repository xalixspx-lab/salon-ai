import { prisma } from '@/lib/prisma';
import { notifyBooking } from '@/lib/notify';

const HOUR = 3600 * 1000;

// تذكير بريدي بالمواعيد المؤكدة التي تبدأ بين 12 و36 ساعة من الآن. تُشغَّل يوميًا،
// ونافذة 24 ساعة تغطي كل موعد مرة واحدة بلا فجوات. نحجز علامة reminderSentAt
// قبل الإرسال بتحديث مشروط (updateMany) فلا يُرسل تذكيران لو تداخل تشغيلان.
// العميل بلا حساب (حجز ضيف) ليس له بريد فيُستثنى من الاستعلام.
export async function sendAppointmentReminders(now = new Date()) {
  const due = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED',
      reminderSentAt: null,
      startTime: { gte: new Date(now.getTime() + 12 * HOUR), lt: new Date(now.getTime() + 36 * HOUR) },
      customer: { accountId: { not: null } },
    },
    orderBy: { startTime: 'asc' },
    take: 500,
    select: { id: true },
  });

  let sent = 0;
  for (const { id } of due) {
    const claimed = await prisma.appointment.updateMany({
      where: { id, reminderSentAt: null },
      data: { reminderSentAt: new Date() },
    });
    if (claimed.count !== 1) continue;
    await notifyBooking(id, 'reminder', ['customer']);
    sent += 1;
  }
  return { due: due.length, sent };
}

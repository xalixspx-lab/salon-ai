import { prisma } from '@/lib/prisma';
import { REFERRAL_BONUS_POINTS, POINTS_PER_COMPLETED_VISIT } from '@/lib/loyaltyConstants';

export * from '@/lib/loyaltyConstants';

// تُمنح النقاط فقط لحساب عميل مسجّل (accountId) — الحجوزات كضيف لا تُحتسب
// لأنه لا يوجد حساب لعرض النقاط فيه أصلًا.
export async function awardCompletionPoints(customerId: string | null) {
  if (!customerId) return;
  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { accountId: true } });
    if (!customer?.accountId) return;
    await prisma.customerAccount.update({
      where: { id: customer.accountId },
      data: { points: { increment: POINTS_PER_COMPLETED_VISIT } },
    });
  } catch (error) {
    console.error('awardCompletionPoints failed:', error);
  }
}

// مكافأة الإحالة: نقاط لكل من الداعي والمدعو، تُمنح مرة واحدة فقط عند أول
// حجز مكتمل للمدعو — نتحقق من ذلك بعدّ حجوزاته المكتملة بدل علامة/حقل منفصل،
// فالعدّاد نفسه لا يعود أبدًا لقيمة 1 بعد أول مرة (ضمانة عدم تكرار طبيعية).
export async function awardReferralBonusIfEligible(customerId: string | null) {
  if (!customerId) return;
  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { accountId: true } });
    if (!customer?.accountId) return;

    const account = await prisma.customerAccount.findUnique({
      where: { id: customer.accountId },
      select: { referredByAccountId: true },
    });
    if (!account?.referredByAccountId) return;

    const linked = await prisma.customer.findMany({ where: { accountId: customer.accountId }, select: { id: true } });
    const completedCount = await prisma.appointment.count({
      where: { customerId: { in: linked.map((c) => c.id) }, status: 'COMPLETED' },
    });
    if (completedCount !== 1) return; // ليست أول زيارة مكتملة للمدعو

    await prisma.$transaction([
      prisma.customerAccount.update({
        where: { id: customer.accountId },
        data: { points: { increment: REFERRAL_BONUS_POINTS } },
      }),
      prisma.customerAccount.update({
        where: { id: account.referredByAccountId },
        data: { points: { increment: REFERRAL_BONUS_POINTS } },
      }),
    ]);
  } catch (error) {
    console.error('awardReferralBonusIfEligible failed:', error);
  }
}

import { prisma } from '@/lib/prisma';

// سياسة نقاط بسيطة وموحّدة بغض النظر عن عملة كل صالون: نقاط ثابتة لكل زيارة
// مكتملة، بدل ربطها بالمبلغ (يختلف معناه بين الصالونات بعملات مختلفة).
export const POINTS_PER_COMPLETED_VISIT = 10;

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

export type CustomerTier = 'NEW' | 'REGULAR' | 'VIP';

// تصنيف مبني على عدد الزيارات المكتملة عبر كل الصالونات (وليس صالون واحد)
export function tierFromVisitCount(completedVisits: number): CustomerTier {
  if (completedVisits >= 10) return 'VIP';
  if (completedVisits >= 2) return 'REGULAR';
  return 'NEW';
}

export const TIER_LABEL: Record<CustomerTier, { ar: string; en: string }> = {
  NEW: { ar: 'عميل جديد', en: 'New customer' },
  REGULAR: { ar: 'عميل دائم', en: 'Regular customer' },
  VIP: { ar: 'عميل مميز (VIP)', en: 'VIP customer' },
};

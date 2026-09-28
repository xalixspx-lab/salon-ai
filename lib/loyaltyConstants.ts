// ثوابت الولاء فقط — بلا أي استيراد لـ prisma، حتى تصلح للاستيراد من مكوّنات
// عميل (Client Components) مباشرة (مثل بطاقة "ادعُ صديقًا") دون سحب حزمة
// Prisma إلى حزمة المتصفح. المنطق الذي يحتاج قاعدة البيانات في lib/loyalty.ts.

// سياسة نقاط بسيطة وموحّدة بغض النظر عن عملة كل صالون: نقاط ثابتة لكل زيارة
// مكتملة، بدل ربطها بالمبلغ (يختلف معناه بين الصالونات بعملات مختلفة).
export const POINTS_PER_COMPLETED_VISIT = 10;

// مكافأة الإحالة: نقاط لكل من الداعي والمدعو عند أول حجز مكتمل للمدعو
export const REFERRAL_BONUS_POINTS = 10;

export type CustomerTier = 'NEW' | 'REGULAR' | 'VIP';

// تصنيف مبني على عدد الزيارات المكتملة عبر كل الصالونات (وليس صالون واحد)
export function tierFromVisitCount(completedVisits: number): CustomerTier {
  if (completedVisits >= 10) return 'VIP';
  if (completedVisits >= 2) return 'REGULAR';
  return 'NEW';
}

// حدّا عتبات التصنيف (مستخدمة في شريط التقدّم بواجهة الحساب حتى لا تتكرر
// الأرقام 2/10 كسحر رقمي في مكانين)
export const TIER_THRESHOLDS = { REGULAR: 2, VIP: 10 } as const;

export const TIER_LABEL: Record<CustomerTier, { ar: string; en: string }> = {
  NEW: { ar: 'عميل جديد', en: 'New customer' },
  REGULAR: { ar: 'عميل دائم', en: 'Regular customer' },
  VIP: { ar: 'عميل مميز (VIP)', en: 'VIP customer' },
};

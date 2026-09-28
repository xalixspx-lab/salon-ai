import { TIER_LABEL, TIER_THRESHOLDS, type CustomerTier } from '@/lib/loyaltyConstants';

// بطاقة الولاء الرئيسية بحساب العميل: النقاط بارزة، التصنيف، وشريط تقدّم
// نحو التصنيف التالي — بديل البادجتين الصغيرتين السابقتين اللتين كانتا
// تُغرقان أهم ميزة تفاضلية نملكها (النقاط الظاهرة للعميل) في التفاصيل.
// النصوص كلها جاهزة مسبقًا (مترجمة ومُعوَّضة) من الصفحة الأب؛ هذا المكوّن
// عرض فقط، ويحسب نسبة الشريط رقميًا من completedVisits/tier.
export default function LoyaltyCard({
  points,
  tier,
  completedVisits,
  locale,
  labels,
}: {
  points: number;
  tier: CustomerTier;
  completedVisits: number;
  locale: string;
  labels: { title: string; howItWorks: string; nextTier: string; maxTier: string };
}) {
  const ar = locale === 'ar';
  const tierLabel = TIER_LABEL[tier][ar ? 'ar' : 'en'];

  const nextThreshold = tier === 'NEW' ? TIER_THRESHOLDS.REGULAR : tier === 'REGULAR' ? TIER_THRESHOLDS.VIP : null;
  const prevThreshold = tier === 'VIP' ? TIER_THRESHOLDS.VIP : tier === 'REGULAR' ? TIER_THRESHOLDS.REGULAR : 0;
  const progressPct = nextThreshold
    ? Math.min(100, Math.round(((completedVisits - prevThreshold) / (nextThreshold - prevThreshold)) * 100))
    : 100;

  return (
    <div className="rounded-2xl bg-gradient-to-l from-brand-700 via-brand-600 to-gold-500 p-5 sm:p-6 text-white">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-white/80 text-sm mb-1">{labels.title}</p>
          <p className="text-4xl font-extrabold leading-none">{points}</p>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/20 backdrop-blur">
          {tier === 'VIP' ? '⭐ ' : ''}
          {tierLabel}
        </span>
      </div>

      {nextThreshold !== null ? (
        <div className="mt-4">
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-white/80 mt-1.5">{labels.nextTier}</p>
        </div>
      ) : (
        <p className="text-xs text-white/80 mt-4">{labels.maxTier}</p>
      )}

      <p className="text-xs text-white/70 mt-3">{labels.howItWorks}</p>
    </div>
  );
}

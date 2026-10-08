'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { Globe } from 'lucide-react';

// مبدّل لغة عام يظهر في كل صفحات الموقع. يحافظ على نفس الصفحة الحالية عند
// التبديل (عبر usePathname/useRouter المولَّدين من next-intl)، ويحفظ الاختيار
// في كوكي NEXT_LOCALE فيُحترم في الزيارات القادمة.
export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const other = locale === 'ar' ? 'en' : 'ar';

  const switchTo = () => {
    router.replace({ pathname, params } as never, { locale: other });
  };

  return (
    <button
      type="button"
      onClick={switchTo}
      className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] end-3 z-50 inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur border border-stone-200 shadow-sm px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-white hover:border-stone-300 transition"
    >
      <Globe className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.8} />
      {other === 'ar' ? 'العربية' : 'English'}
    </button>
  );
}

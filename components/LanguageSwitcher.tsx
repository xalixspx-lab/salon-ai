'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';

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
      className="fixed top-3 end-3 z-50 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-sm px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white transition"
    >
      {other === 'ar' ? 'العربية' : 'English'}
    </button>
  );
}

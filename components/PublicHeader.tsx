import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Sparkles } from 'lucide-react';
import MobileNavMenu from '@/components/MobileNavMenu';
import { buttonClass } from '@/components/ui/Button';

// شريط علوي للصفحات العامة: المنصة موجّهة لأصحاب الصالونات، فلا دخول/تسجيل للعملاء.
export default async function PublicHeader({ locale }: { locale: string }) {
  const t = await getTranslations('Nav');
  const link = 'px-3.5 py-2 rounded-lg font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors';

  return (
    <header className="bg-white/85 backdrop-blur-xl border-b border-stone-200/70 sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href={`/${locale}`} className="flex items-center gap-2.5 shrink-0">
          <span className="h-9 w-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm shadow-brand-600/30">
            <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
          <span className="font-bold text-lg tracking-tight text-stone-900">Salon AI</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1.5 text-sm sm:me-24">
          <Link href={`/${locale}#features`} className={`hidden lg:block ${link}`}>
            {t('features')}
          </Link>
          <Link href={`/${locale}#how`} className={`hidden lg:block ${link}`}>
            {t('how')}
          </Link>
          <Link href={`/${locale}/salons`} className={link}>
            {t('directory')}
          </Link>
          <span className="mx-1.5 h-5 w-px bg-stone-200 hidden lg:block" aria-hidden />
          <Link href={`/${locale}/login`} className={`${link} text-stone-700`}>
            {t('ownerLogin')}
          </Link>
          <Link href={`/${locale}/salons/new`} className={buttonClass('primary', 'sm')}>
            {t('registerSalon')}
          </Link>
        </nav>

        {/* me-20: يفسح مجالًا لمبدّل اللغة الثابت عالميًا (fixed top-3 end-3) */}
        <div className="sm:hidden me-20">
          <MobileNavMenu
            locale={locale}
            labels={{ features: t('features'), how: t('how'), directory: t('directory'), login: t('ownerLogin'), register: t('registerSalon'), menu: t('menu') }}
          />
        </div>
      </div>
    </header>
  );
}

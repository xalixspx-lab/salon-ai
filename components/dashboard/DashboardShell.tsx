'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ReactNode, useState } from 'react';

export default function DashboardShell({
  locale,
  tenantName,
  logoUrl,
  children,
}: {
  locale: string;
  tenantName: string;
  logoUrl?: string | null;
  children: ReactNode;
}) {
  const t = useTranslations('Dashboard');
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const base = `/${locale}/dashboard`;
  const links = [
    { href: base, label: t('overview'), icon: '📊' },
    { href: `${base}/bookings`, label: t('appointments'), icon: '📅' },
    { href: `${base}/calendar`, label: t('calendar'), icon: '🗓️' },
    { href: `${base}/clients`, label: t('clients'), icon: '👥' },
    { href: `${base}/services`, label: t('services'), icon: '💇‍♀️' },
    { href: `${base}/reviews`, label: t('reviews'), icon: '⭐' },
    { href: `${base}/offers`, label: t('offers'), icon: '🏷️' },
    { href: `${base}/staff`, label: t('staff'), icon: '🧑‍💼' },
    { href: `${base}/subscription`, label: t('subscription'), icon: '💳' },
    { href: `${base}/settings`, label: t('settings'), icon: '⚙️' },
  ];

  const isActive = (href: string) => pathname === href;
  // أول رابط مطابق فعليًا (وليس فقط تطابقًا تامًا) لعنوان الشريط العلوي على
  // الجوال — صفحات فرعية مثل clients/[id] تبقى منسوبة لقسم "العملاء"
  const current = [...links].reverse().find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`)) ?? links[0];

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(`/${locale}/login`);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-stone-100 flex">
      <aside className="w-64 bg-white border-e border-stone-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-stone-200">
          <span className="text-xl font-bold text-brand-700">
            {tenantName ? tenantName : t('title')}
          </span>
          <div className="flex items-center gap-2 mt-1">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={tenantName} className="h-6 w-6 rounded-md object-cover" />
            )}
            <p className="text-xs text-stone-500 truncate">{t('title')}</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${
                isActive(link.href)
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* شريط علوي: على الجوال يعوّض هوية الصالون المختفية مع الشريط
            الجانبي؛ في كل العروض يحمل قائمة حساب موحّدة (عودة للمتجر/خروج)
            بدل تكرارها أسفل الشريط الجانبي أيضًا */}
        <header className="sticky top-0 z-30 bg-white border-b border-stone-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:hidden min-w-0">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={tenantName} className="h-7 w-7 rounded-md object-cover shrink-0" />
            )}
            <span className="font-bold text-brand-700 truncate">{tenantName || t('title')}</span>
          </div>
          <span className="hidden md:block font-semibold text-stone-800">{current.label}</span>

          {/* me-14: يفسح مجالًا لمبدّل اللغة الثابت عالميًا (fixed top-3 end-3)
              حتى لا يتراكب معه هذا الزر في نفس الزاوية */}
          <div className="relative shrink-0 me-20">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center"
              aria-label={t('title')}
            >
              {(tenantName || 'S').charAt(0)}
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute end-0 top-full mt-2 w-52 bg-white rounded-2xl border border-stone-100 shadow-lg z-50 p-2 text-sm">
                  <Link
                    href={`/${locale}`}
                    onClick={() => setProfileOpen(false)}
                    className="block px-3 py-2.5 rounded-xl text-stone-700 hover:bg-stone-50"
                  >
                    ← {t('backToStore')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full text-start px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {t('logout')}
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8 pb-24 md:pb-8 overflow-y-auto">{children}</main>

        {/* شريط تنقّل سفلي للجوال فقط — الشريط الجانبي يختفي تحت md بلا أي
            بديل حاليًا، فمالك الصالون على هاتفه بلا أي تنقّل إطلاقًا */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-stone-200 flex overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium ${
                isActive(link.href) ? 'text-brand-700' : 'text-stone-500'
              }`}
            >
              <span className="text-lg leading-none">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

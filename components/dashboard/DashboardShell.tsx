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
  const common = useTranslations('Common');
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

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
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {common('appName')} - {t('title')}
          </span>
          <div className="flex items-center gap-2 mt-1">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={tenantName} className="h-6 w-6 rounded-md object-cover" />
            )}
            <p className="text-xs text-stone-500 truncate">{tenantName}</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${
                isActive(link.href)
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-stone-200 space-y-2">
          <Link href={`/${locale}`} className="block text-center text-sm text-stone-500 hover:text-stone-800 transition">
            ← {t('backToStore')}
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full text-center text-sm text-red-500 hover:text-red-700 transition disabled:opacity-50"
          >
            {t('logout')}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}

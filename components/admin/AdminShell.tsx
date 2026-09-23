'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ReactNode, useState } from 'react';

export default function AdminShell({
  locale,
  adminEmail,
  children,
}: {
  locale: string;
  adminEmail: string;
  children: ReactNode;
}) {
  const t = useTranslations('Admin');
  const common = useTranslations('Common');
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const base = `/${locale}/admin`;
  const links = [
    { href: base, label: t('overview'), icon: '📊' },
    { href: `${base}/salons`, label: t('salons'), icon: '🏢' },
    { href: `${base}/owners`, label: t('owners'), icon: '🧑‍💼' },
    { href: `${base}/customers`, label: t('customers'), icon: '👤' },
    { href: `${base}/bookings`, label: t('bookings'), icon: '📅' },
    { href: `${base}/reviews`, label: t('reviews'), icon: '⭐' },
    { href: `${base}/database`, label: t('database'), icon: '🗄️' },
    { href: `${base}/admins`, label: t('admins'), icon: '🛡️' },
    { href: `${base}/settings`, label: t('platformSettings'), icon: '⚙️' },
    { href: `${base}/audit`, label: t('audit'), icon: '🧾' },
  ];

  const isActive = (href: string) => pathname === href;

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push(`/${locale}/admin/login`);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-64 bg-slate-900 text-slate-100 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <span className="text-xl font-bold text-white">{common('appName')}</span>
          <p className="text-xs text-slate-400 mt-1">{t('portalTitle')}</p>
          <p className="text-xs text-slate-500 mt-2 truncate" dir="ltr">{adminEmail}</p>
          <Link href={`${base}/change-password`} className="text-xs text-slate-400 hover:text-white underline">{t('changePassword')}</Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${
                isActive(link.href) ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full text-center text-sm text-red-400 hover:text-red-300 transition disabled:opacity-50"
          >
            {t('logout')}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}

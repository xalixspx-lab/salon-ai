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
  const [profileOpen, setProfileOpen] = useState(false);

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
  const current = [...links].reverse().find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`)) ?? links[0];

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
          <p className="text-xs text-gold-400 mt-1">{t('portalTitle')}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${
                isActive(link.href) ? 'bg-slate-800 text-gold-400' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:hidden min-w-0">
            <span className="font-bold text-white truncate">{common('appName')}</span>
            <span className="text-[11px] text-gold-400 truncate">{t('portalTitle')}</span>
          </div>
          <span className="hidden md:block font-semibold text-slate-100">{current.label}</span>

          <div className="relative shrink-0 me-20">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="h-9 w-9 rounded-full bg-gold-500/10 text-gold-400 font-bold flex items-center justify-center border border-gold-500/30"
              aria-label={t('portalTitle')}
            >
              {adminEmail.charAt(0).toUpperCase()}
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute end-0 top-full mt-2 w-56 bg-slate-800 rounded-2xl border border-slate-700 shadow-lg z-50 p-2 text-sm">
                  <p className="px-3 py-2 text-xs text-slate-400 truncate" dir="ltr">{adminEmail}</p>
                  <Link
                    href={`${base}/change-password`}
                    onClick={() => setProfileOpen(false)}
                    className="block px-3 py-2.5 rounded-xl text-slate-200 hover:bg-slate-700"
                  >
                    {t('changePassword')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full text-start px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {t('logout')}
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8 pb-24 md:pb-8 overflow-y-auto">{children}</main>

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900 border-t border-slate-700 flex overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium ${
                isActive(link.href) ? 'text-gold-400' : 'text-slate-400'
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

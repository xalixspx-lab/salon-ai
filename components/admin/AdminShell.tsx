'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ReactNode, useState } from 'react';
import {
  Building2,
  CalendarDays,
  Database,
  Ellipsis,
  KeyRound,
  LayoutDashboard,
  LineChart,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

type NavLink = { href: string; label: string; icon: LucideIcon };

// واجهة الأدمن: شريط جانبي داكن متمايز (حدّ أمني بصري عن واجهة المالك) بنفس هيكل Metronic.
export default function AdminShell({ locale, adminEmail, children }: { locale: string; adminEmail: string; children: ReactNode }) {
  const t = useTranslations('Admin');
  const common = useTranslations('Common');
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const base = `/${locale}/admin`;
  const groups: { title: string; links: NavLink[] }[] = [
    {
      title: t('navPlatform'),
      links: [
        { href: base, label: t('overview'), icon: LayoutDashboard },
        { href: `${base}/salons`, label: t('salons'), icon: Building2 },
        { href: `${base}/owners`, label: t('owners'), icon: UserCog },
        { href: `${base}/customers`, label: t('customers'), icon: Users },
        { href: `${base}/bookings`, label: t('bookings'), icon: CalendarDays },
      ],
    },
    {
      title: t('navInsights'),
      links: [{ href: `${base}/reports`, label: t('reports'), icon: LineChart }],
    },
    {
      title: t('navSystem'),
      links: [
        { href: `${base}/database`, label: t('database'), icon: Database },
        { href: `${base}/admins`, label: t('admins'), icon: ShieldCheck },
        { href: `${base}/settings`, label: t('platformSettings'), icon: Settings },
        { href: `${base}/audit`, label: t('audit'), icon: ScrollText },
      ],
    },
  ];
  const links = groups.flatMap((g) => g.links);
  const primary = links.slice(0, 4);

  const isActive = (href: string) => (href === base ? pathname === base : pathname === href || pathname.startsWith(`${href}/`));
  const current = [...links].reverse().find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`)) ?? links[0];
  const moreActive = !primary.some((l) => isActive(l.href));

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push(`/${locale}/admin/login`);
    router.refresh();
  };

  const NavItem = ({ link, onNavigate, dark = true }: { link: NavLink; onNavigate?: () => void; dark?: boolean }) => {
    const Icon = link.icon;
    const active = isActive(link.href);
    const cls = dark
      ? active
        ? 'bg-white/10 text-white'
        : 'text-slate-300 hover:bg-white/5 hover:text-white'
      : active
        ? 'bg-slate-100 text-slate-900'
        : 'text-slate-600 hover:bg-slate-50';
    return (
      <Link href={link.href} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors ${cls}`}>
        <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? (dark ? 'text-gold-400' : 'text-brand-600') : dark ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-400'}`} strokeWidth={1.8} />
        <span className="truncate">{link.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex">
      <aside className="w-[270px] shrink-0 bg-slate-900 text-slate-100 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="h-16 px-5 border-b border-white/10 flex items-center gap-3">
          <span className="h-9 w-9 rounded-lg bg-brand-600 text-white flex items-center justify-center">
            <KeyRound className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{common('appName')}</p>
            <p className="text-[11px] text-gold-400 truncate">{t('portalTitle')}</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{g.title}</p>
              <div className="space-y-0.5">
                {g.links.map((l) => (
                  <NavItem key={l.href} link={l} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:py-0 md:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:hidden min-w-0">
            <span className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <KeyRound className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="font-semibold text-slate-900 truncate">{t('portalTitle')}</span>
          </div>
          <h1 className="hidden md:block text-[15px] font-semibold text-slate-900">{current.label}</h1>

          <div className="relative shrink-0 me-20">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="h-9 w-9 rounded-full bg-slate-900 text-gold-400 font-semibold flex items-center justify-center ring-2 ring-white shadow-sm"
              aria-label={t('portalTitle')}
              aria-expanded={profileOpen}
            >
              {adminEmail.charAt(0).toUpperCase()}
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute end-0 top-full mt-2 w-60 bg-white rounded-xl border border-slate-200 shadow-lg z-50 p-1.5 text-sm">
                  <p className="px-3 py-2 text-xs text-slate-500 truncate border-b border-slate-100 mb-1" dir="ltr">
                    {adminEmail}
                  </p>
                  <Link href={`${base}/change-password`} onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50">
                    <KeyRound className="h-4 w-4 text-slate-400" strokeWidth={1.8} /> {t('changePassword')}
                  </Link>
                  <button onClick={handleLogout} disabled={loggingOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50">
                    <LogOut className="h-4 w-4" strokeWidth={1.8} /> {t('logout')}
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8 overflow-y-auto">{children}</main>

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900 border-t border-white/10 flex pb-[env(safe-area-inset-bottom)]">
          {primary.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link key={link.href} href={link.href} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${active ? 'text-gold-400' : 'text-slate-400'}`}>
                <span className={`h-7 w-12 rounded-full flex items-center justify-center ${active ? 'bg-white/10' : ''}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="truncate max-w-full px-1">{link.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setMoreOpen(true)} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${moreActive ? 'text-gold-400' : 'text-slate-400'}`}>
            <span className={`h-7 w-12 rounded-full flex items-center justify-center ${moreActive ? 'bg-white/10' : ''}`}>
              <Ellipsis className="h-5 w-5" strokeWidth={1.8} />
            </span>
            {t('more')}
          </button>
        </nav>

        {moreOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={t('more')}>
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMoreOpen(false)} />
            <div className="relative bg-white rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-slate-900">{t('more')}</p>
                <button onClick={() => setMoreOpen(false)} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {links.map((l) => (
                  <NavItem key={l.href} link={l} dark={false} onNavigate={() => setMoreOpen(false)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

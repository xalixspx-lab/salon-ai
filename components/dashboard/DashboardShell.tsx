'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ReactNode, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  CreditCard,
  Ellipsis,
  LayoutDashboard,
  LineChart,
  LogOut,
  MessageSquare,
  Scissors,
  Settings,
  Store,
  Tag,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

type NavLink = { href: string; label: string; icon: LucideIcon };

// واجهة لوحة المالك بأسلوب Metronic: شريط جانبي أبيض بمجموعات، شريط علوي نظيف،
// وعلى الجوال شريط سفلي بخمس وجهات رئيسية + ورقة "المزيد" لباقي الأقسام.
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
  const [moreOpen, setMoreOpen] = useState(false);

  const base = `/${locale}/dashboard`;
  const groups: { title: string; links: NavLink[] }[] = [
    {
      title: t('navMain'),
      links: [
        { href: base, label: t('overview'), icon: LayoutDashboard },
        { href: `${base}/inbox`, label: t('inbox'), icon: MessageSquare },
        { href: `${base}/bookings`, label: t('appointments'), icon: CalendarDays },
        { href: `${base}/calendar`, label: t('calendar'), icon: CalendarRange },
        { href: `${base}/clients`, label: t('clients'), icon: Users },
      ],
    },
    {
      title: t('navBusiness'),
      links: [
        { href: `${base}/services`, label: t('services'), icon: Scissors },
        { href: `${base}/staff`, label: t('staff'), icon: UserCog },
        { href: `${base}/offers`, label: t('offers'), icon: Tag },
        { href: `${base}/reports`, label: t('reports'), icon: LineChart },
      ],
    },
    {
      title: t('navAccount'),
      links: [
        { href: `${base}/subscription`, label: t('subscription'), icon: CreditCard },
        { href: `${base}/settings`, label: t('settings'), icon: Settings },
      ],
    },
  ];
  const links = groups.flatMap((g) => g.links);
  const primary = links.slice(0, 4);

  const isActive = (href: string) => (href === base ? pathname === base : pathname === href || pathname.startsWith(`${href}/`));
  // الصفحات الفرعية (clients/[id]…) تبقى منسوبة لقسمها في عنوان الشريط العلوي
  const current = [...links].reverse().find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`)) ?? links[0];
  const moreActive = !primary.some((l) => isActive(l.href));

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(`/${locale}/login`);
    router.refresh();
  };

  const NavItem = ({ link, onNavigate }: { link: NavLink; onNavigate?: () => void }) => {
    const Icon = link.icon;
    const active = isActive(link.href);
    return (
      <Link
        href={link.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors ${
          active ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
        }`}
      >
        <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-brand-600' : 'text-stone-400 group-hover:text-stone-600'}`} strokeWidth={1.8} />
        <span className="truncate">{link.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f6f8] flex">
      <aside className="w-[270px] shrink-0 bg-white border-e border-stone-200 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="h-16 px-5 border-b border-stone-200 flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={tenantName} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <span className="h-9 w-9 rounded-lg bg-brand-600 text-white flex items-center justify-center">
              <Store className="h-5 w-5" strokeWidth={1.8} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-900 truncate">{tenantName || t('title')}</p>
            <p className="text-[11px] text-stone-400 truncate">{t('title')}</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">{g.title}</p>
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
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-stone-200 px-4 sm:px-6 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:py-0 md:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 md:hidden min-w-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={tenantName} className="h-8 w-8 rounded-lg object-cover shrink-0" />
            ) : (
              <span className="h-8 w-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
                <Store className="h-4 w-4" strokeWidth={1.8} />
              </span>
            )}
            <span className="font-semibold text-stone-900 truncate">{tenantName || t('title')}</span>
          </div>
          <h1 className="hidden md:block text-[15px] font-semibold text-stone-900">{current.label}</h1>

          {/* me-20: يفسح مجالًا لمبدّل اللغة الثابت عالميًا (fixed top-3 end-3) */}
          <div className="relative shrink-0 me-20">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center ring-2 ring-white shadow-sm"
              aria-label={t('title')}
              aria-expanded={profileOpen}
            >
              {(tenantName || 'S').charAt(0)}
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute end-0 top-full mt-2 w-56 bg-white rounded-xl border border-stone-200 shadow-lg z-50 p-1.5 text-sm">
                  <div className="px-3 py-2 border-b border-stone-100 mb-1">
                    <p className="font-semibold text-stone-900 truncate">{tenantName || t('title')}</p>
                  </div>
                  <Link href={`/${locale}`} onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-700 hover:bg-stone-50">
                    <Store className="h-4 w-4 text-stone-400" strokeWidth={1.8} /> {t('backToStore')}
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

        {/* شريط سفلي للجوال: أربع وجهات رئيسية + المزيد */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-stone-200 flex pb-[env(safe-area-inset-bottom)]">
          {primary.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link key={link.href} href={link.href} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${active ? 'text-brand-700' : 'text-stone-500'}`}>
                <span className={`h-7 w-12 rounded-full flex items-center justify-center ${active ? 'bg-brand-50' : ''}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="truncate max-w-full px-1">{link.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setMoreOpen(true)} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${moreActive ? 'text-brand-700' : 'text-stone-500'}`}>
            <span className={`h-7 w-12 rounded-full flex items-center justify-center ${moreActive ? 'bg-brand-50' : ''}`}>
              <Ellipsis className="h-5 w-5" strokeWidth={1.8} />
            </span>
            {t('more')}
          </button>
        </nav>

        {moreOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={t('more')}>
            <div className="absolute inset-0 bg-stone-900/40" onClick={() => setMoreOpen(false)} />
            <div className="relative bg-white rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-stone-900">{t('more')}</p>
                <button onClick={() => setMoreOpen(false)} className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center" aria-label="close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {links.map((l) => (
                  <NavItem key={l.href} link={l} onNavigate={() => setMoreOpen(false)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

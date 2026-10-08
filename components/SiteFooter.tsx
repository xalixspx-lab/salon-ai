'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Sparkles } from 'lucide-react';

const HIDE_ON = /^\/(ar|en)\/(dashboard|admin)(\/|$)/;

// تذييل عام: الشعار + روابط المنصة + الوثائق القانونية. يُخفى في لوحتي المالك والأدمن.
export default function SiteFooter() {
  const locale = useLocale();
  const pathname = usePathname();
  if (HIDE_ON.test(pathname)) return null;
  const ar = locale === 'ar';
  const legal: Array<[string, string, string]> = [
    ['terms', 'شروط استخدام العملاء', 'Customer terms'],
    ['tenant-agreement', 'اتفاقية الصالون', 'Salon agreement'],
    ['privacy', 'سياسة الخصوصية', 'Privacy policy'],
    ['refund', 'سياسة العربون والاسترداد', 'Deposit & refund policy'],
  ];
  const platform: Array<[string, string, string]> = [
    ['salons', 'اكتشف الصالونات', 'Discover salons'],
    ['salons/new', 'سجّل صالونك', 'List your salon'],
    ['account/login', 'تسجيل الدخول', 'Sign in'],
    ['account/register', 'إنشاء حساب', 'Create account'],
  ];
  const head = 'text-xs font-semibold uppercase tracking-wide text-stone-400 mb-3';
  const link = 'text-sm text-stone-600 hover:text-brand-700 transition-colors';
  return (
    <footer className="border-t border-stone-200 bg-white" dir={ar ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="h-9 w-9 rounded-xl bg-brand-600 text-white flex items-center justify-center">
              <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <span className="font-bold text-lg text-stone-900">Salon AI</span>
          </div>
          <p className="text-sm text-stone-500 max-w-sm leading-relaxed">
            {ar ? 'منصة ذكية لحجز مواعيد الصالونات في دول الخليج: اكتشف، قارن، واحجز في ثوانٍ.' : 'A smart salon-booking platform for the GCC: discover, compare and book in seconds.'}
          </p>
        </div>
        <div>
          <p className={head}>{ar ? 'المنصة' : 'Platform'}</p>
          <ul className="space-y-2.5">
            {platform.map(([slug, a, e]) => (
              <li key={slug}>
                <Link href={`/${locale}/${slug}`} className={link}>
                  {ar ? a : e}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className={head}>{ar ? 'قانوني' : 'Legal'}</p>
          <ul className="space-y-2.5">
            {legal.map(([slug, a, e]) => (
              <li key={slug}>
                <Link href={`/${locale}/legal/${slug}`} className={link}>
                  {ar ? a : e}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-400">
          <span>© {new Date().getFullYear()} Salon AI</span>
          <Link href={`/${locale}/legal`} className="hover:text-stone-600">
            {ar ? 'جميع الوثائق القانونية' : 'All legal documents'}
          </Link>
        </div>
      </div>
    </footer>
  );
}

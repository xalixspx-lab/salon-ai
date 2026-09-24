'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

const HIDE_ON = /^\/(ar|en)\/(dashboard|admin)(\/|$)/;

// تذييل عام بروابط الوثائق القانونية. يُخفى في لوحتي المالك والأدمن.
export default function SiteFooter() {
  const locale = useLocale();
  const pathname = usePathname();
  if (HIDE_ON.test(pathname)) return null;
  const ar = locale === 'ar';
  const links: Array<[string, string, string]> = [
    ['terms', 'شروط استخدام العملاء', 'Customer terms'],
    ['tenant-agreement', 'اتفاقية الصالون', 'Salon agreement'],
    ['privacy', 'سياسة الخصوصية', 'Privacy policy'],
    ['refund', 'سياسة العربون والاسترداد', 'Deposit & refund policy'],
  ];
  return (
    <footer className="border-t border-gray-200 bg-white px-4 py-6 text-xs text-gray-500" dir={ar ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <span>© {new Date().getFullYear()} Salon AI</span>
        <nav className="flex flex-wrap gap-4">
          <Link href={`/${locale}/legal`} className="font-semibold text-gray-700 hover:underline">
            {ar ? 'الوثائق القانونية' : 'Legal'}
          </Link>
          {links.map(([slug, a, e]) => (
            <Link key={slug} href={`/${locale}/legal/${slug}`} className="hover:text-gray-800 hover:underline">
              {ar ? a : e}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

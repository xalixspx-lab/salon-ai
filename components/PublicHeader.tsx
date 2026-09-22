import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCustomerSession } from '@/lib/customerSession';
import LogoutButton from '@/components/account/LogoutButton';

// شريط علوي ثابت لكل الصفحات العامة (الرئيسية، الصالونات، تفاصيل صالون، تسجيل
// صالون جديد، دخول المالك) — نقطة الدخول الوحيدة لحساب العميل والمالك، لم تكن
// موجودة سابقًا فكان حساب العميل بلا أي طريق للوصول إليه من الصفحات العامة.
export default async function PublicHeader({ locale }: { locale: string }) {
  const t = await getTranslations('Account');
  const session = await getCustomerSession();

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link href={`/${locale}`} className="font-extrabold text-lg text-gray-900 shrink-0">
          Salon AI
        </Link>

        <nav className="flex items-center gap-3 sm:gap-4 text-sm">
          <Link href={`/${locale}/salons`} className="text-gray-600 hover:text-gray-900 hidden sm:inline">
            {t('navDiscover')}
          </Link>

          {session ? (
            <>
              <Link href={`/${locale}/account`} className="text-gray-700 font-medium hover:text-gray-900">
                {session.name}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href={`/${locale}/account/login`} className="text-gray-600 hover:text-gray-900">
                {t('login')}
              </Link>
              <Link
                href={`/${locale}/account/register`}
                className="bg-black text-white px-3 py-1.5 rounded-md hover:bg-gray-800 transition"
              >
                {t('registerLink')}
              </Link>
            </>
          )}

          <Link href={`/${locale}/login`} className="text-gray-400 hover:text-gray-600 text-xs border-s border-gray-200 ps-3">
            {t('navForOwners')}
          </Link>
        </nav>
      </div>
    </header>
  );
}

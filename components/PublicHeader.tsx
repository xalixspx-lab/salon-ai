import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCustomerSession } from '@/lib/customerSession';
import LogoutButton from '@/components/account/LogoutButton';
import MobileNavMenu from '@/components/MobileNavMenu';

// شريط علوي ثابت لكل الصفحات العامة (الرئيسية، الصالونات، تفاصيل صالون، تسجيل
// صالون جديد، دخول المالك) — نقطة الدخول الوحيدة لحساب العميل والمالك، لم تكن
// موجودة سابقًا فكان حساب العميل بلا أي طريق للوصول إليه من الصفحات العامة.
// تحت sm تُستبدل قائمة الروابط الأفقية بقائمة منسدلة (MobileNavMenu) بدل
// wrap عشوائي، لأن عدد الروابط سينمو (الإحالة، إلخ) ولن يتسع صف واحد بعدها.
export default async function PublicHeader({ locale }: { locale: string }) {
  const t = await getTranslations('Account');
  const session = await getCustomerSession();

  return (
    <header className="bg-white/90 backdrop-blur border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link href={`/${locale}`} className="font-extrabold text-lg text-gray-900 shrink-0">
          Salon AI
        </Link>

        <nav className="hidden sm:flex items-center gap-4 text-sm flex-wrap justify-end">
          <Link href={`/${locale}/salons`} className="text-gray-600 hover:text-gray-900">
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
              {/* نموذج دخول واحد يتعرّف تلقائيًا هل الداخل عميل أو صاحب صالون */}
              <Link href={`/${locale}/account/login`} className="text-gray-600 hover:text-gray-900">
                {t('login')}
              </Link>
              <Link
                href={`/${locale}/account/register`}
                className="bg-black text-white px-3 py-1.5 rounded-full hover:bg-gray-800 transition"
              >
                {t('registerLink')}
              </Link>
            </>
          )}
        </nav>

        {/* me-20: يفسح مجالًا لمبدّل اللغة الثابت عالميًا (fixed top-3 end-3)
            حتى لا يتراكب معه هذا الزر في نفس الزاوية، بنفس المقياس المستخدم
            في DashboardShell/AdminShell لنفس المشكلة */}
        <div className="sm:hidden me-20">
          <MobileNavMenu
            locale={locale}
            loggedIn={Boolean(session)}
            name={session?.name}
            labels={{
              discover: t('navDiscover'),
              login: t('login'),
              register: t('registerLink'),
              account: t('myAccount'),
            }}
          />
        </div>
      </div>
    </header>
  );
}

import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function LocaleNotFound() {
  const t = await getTranslations('Errors');
  const locale = await getLocale();

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl font-extrabold text-brand-600 mb-3">404</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t('notFoundTitle')}</h1>
        <p className="text-gray-500 mb-6">{t('notFoundDesc')}</p>
        <Link href={`/${locale}`} className="inline-block bg-brand-600 text-white rounded-xl px-5 py-2.5 font-medium hover:bg-brand-700">
          {t('backHome')}
        </Link>
      </div>
    </main>
  );
}

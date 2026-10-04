'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

// حد أخطاء لكل صفحات اللغة: فشل استعلام خادم يعرض رسالة مفهومة بزر إعادة
// المحاولة بدل صفحة بيضاء، ويُبلَّغ Sentry تلقائيًا
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('Errors');
  const params = useParams<{ locale: string }>();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4" aria-hidden>⚠️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t('errorTitle')}</h1>
        <p className="text-gray-500 mb-6">{t('errorDesc')}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="bg-brand-600 text-white rounded-xl px-5 py-2.5 font-medium hover:bg-brand-700">
            {t('retry')}
          </button>
          <Link href={`/${params?.locale ?? 'ar'}`} className="border border-gray-200 rounded-xl px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
            {t('backHome')}
          </Link>
        </div>
      </div>
    </main>
  );
}

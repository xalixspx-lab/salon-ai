import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import SiteFooter from '@/components/SiteFooter';
import "../globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const viewport: Viewport = { themeColor: '#7c3aed' };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Index' });
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t('title'), template: '%s | Salon AI' },
    description: t('description'),
    alternates: { languages: { ar: '/ar', en: '/en' } },
    openGraph: { siteName: 'Salon AI', title: t('title'), description: t('description'), locale: locale === 'ar' ? 'ar_BH' : 'en_GB', type: 'website' },
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  
  // جلب الرسائل الخاصة باللغة الحالية
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <LanguageSwitcher />
          {children}
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
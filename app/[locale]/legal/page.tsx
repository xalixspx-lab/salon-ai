import type { Metadata } from 'next';
import Link from 'next/link';
import PublicHeader from '@/components/PublicHeader';
import { LEGAL_AUDIENCE, LEGAL_DOCS, LEGAL_SLUGS, type LegalAudience } from '@/lib/legalContent';
import { LEGAL_VERSION } from '@/lib/legal';

export const metadata: Metadata = { title: 'الوثائق القانونية | Legal' };

const GROUPS: Array<{ key: LegalAudience[]; ar: string; en: string; hintAr: string; hintEn: string }> = [
  {
    key: ['customer', 'both'],
    ar: 'للعملاء',
    en: 'For customers',
    hintAr: 'ما يحكم استخدامك للمنصة وحجوزاتك وبياناتك.',
    hintEn: 'What governs your use of the platform, your bookings and your data.',
  },
  {
    key: ['owner', 'both'],
    ar: 'لأصحاب الصالونات',
    en: 'For salon owners',
    hintAr: 'ما يحكم اشتراكك في المنصة ومسؤولياتك تجاه عملائك.',
    hintEn: 'What governs your subscription and your responsibilities towards your customers.',
  },
];

const AUDIENCE_LABEL: Record<LegalAudience, { ar: string; en: string }> = {
  customer: { ar: 'للعملاء', en: 'Customers' },
  owner: { ar: 'لأصحاب الصالونات', en: 'Salon owners' },
  both: { ar: 'للجميع', en: 'Everyone' },
};

export default async function LegalHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'en' ? 'en' : 'ar';

  return (
    <>
      <PublicHeader locale={locale} />
      <main className="min-h-screen bg-gray-50 px-4 py-10" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{lang === 'ar' ? 'الوثائق القانونية' : 'Legal documents'}</h1>
          <p className="text-sm text-gray-500 mb-8">
            {lang === 'ar' ? 'رقم النسخة الحالية' : 'Current version'}: {LEGAL_VERSION}
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {GROUPS.map((g) => (
              <section key={g.ar} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{lang === 'ar' ? g.ar : g.en}</h2>
                <p className="text-sm text-gray-500 mb-4">{lang === 'ar' ? g.hintAr : g.hintEn}</p>
                <ul className="space-y-3">
                  {LEGAL_SLUGS.filter((s) => g.key.includes(LEGAL_AUDIENCE[s])).map((s) => (
                    <li key={s}>
                      <Link href={`/${locale}/legal/${s}`} className="block rounded-xl border border-gray-100 p-3 hover:border-gray-300">
                        <span className="font-semibold text-gray-900">{LEGAL_DOCS[s][lang].title}</span>
                        <span className="ms-2 text-[11px] rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">
                          {AUDIENCE_LABEL[LEGAL_AUDIENCE[s]][lang]}
                        </span>
                        <span className="block text-xs text-gray-500 mt-1">{LEGAL_DOCS[s][lang].summary}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

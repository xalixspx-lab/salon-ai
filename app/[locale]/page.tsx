import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import SalonGrid from '@/components/SalonGrid';
import FeaturedSalonsStrip from '@/components/FeaturedSalonsStrip';
import PublicHeader from '@/components/PublicHeader';
import { listPublicSalons } from '@/lib/publicSalons';

export const dynamic = 'force-dynamic';

async function getSalons() {
  try {
    return await listPublicSalons();
  } catch (error) {
    console.error('Failed to load salons:', error);
    return [];
  }
}

const FEATURES = [
  { key: 'feature1', emoji: '⚡', gradient: 'from-violet-500 to-fuchsia-500' },
  { key: 'feature2', emoji: '🎁', gradient: 'from-amber-400 to-rose-500' },
  { key: 'feature3', emoji: '🏷️', gradient: 'from-fuchsia-500 to-rose-500' },
  { key: 'feature4', emoji: '🔔', gradient: 'from-sky-500 to-violet-500' },
] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  // استخدام getTranslations بدلاً من useTranslations في الـ Async Server Component
  const t = await getTranslations('Index');
  const salons = await getSalons();
  const featuredSalons = salons.filter((s) => s.isFeatured);

  return (
    <>
      <PublicHeader locale={locale} />
      <main dir={dir}>
        {/* واجهة استقبال — عنوان جذاب، شارة، ودعوتان للفعل (اكتشف/سجّل صالونك) */}
        <section className="relative overflow-hidden bg-gradient-to-b from-violet-50 via-white to-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -start-24 h-72 w-72 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 opacity-25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-24 -end-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber-300 to-rose-400 opacity-25 blur-3xl"
          />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-16 sm:pb-20 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1.5 mb-6">
              ✨ {t('heroBadge')}
            </span>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-900 mb-5 leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500">
                {t('heroTitleHighlight')}
              </span>{' '}
              {t('heroTitleRest')}
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-9">
              {t('heroSubtitle')}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/${locale}/salons`}
                className="rounded-full bg-gray-900 text-white px-7 py-3 font-semibold hover:bg-gray-800 transition shadow-lg shadow-gray-900/10"
              >
                {t('ctaDiscover')}
              </Link>
              <Link
                href={`/${locale}/salons/new`}
                className="rounded-full bg-white border border-gray-200 text-gray-800 px-7 py-3 font-semibold hover:border-gray-300 hover:bg-gray-50 transition"
              >
                {t('ctaOwner')}
              </Link>
            </div>
          </div>
        </section>

        {/* بطاقات المزايا الأربع */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition"
              >
                <div
                  className={`h-11 w-11 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-xl mb-4`}
                >
                  {f.emoji}
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5">{t(`${f.key}Title` as 'feature1Title')}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(`${f.key}Desc` as 'feature1Desc')}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-gray-50 p-6 md:p-12 pt-2 md:pt-4">
          {/* قسم الصالونات المميزة (تختارها الإدارة) */}
          {featuredSalons.length > 0 && (
            <section className="max-w-6xl mx-auto mb-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('featuredSalonsTitle')}</h2>
              <FeaturedSalonsStrip locale={locale} salons={featuredSalons} />
            </section>
          )}

          {/* قسم استعراض الصالونات */}
          <section className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('availableSalonsTitle')}</h2>
            <SalonGrid locale={locale} salons={salons} />
          </section>
        </div>

        {/* دعوة ختامية لأصحاب الصالونات */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-violet-600 via-fuchsia-600 to-rose-500 px-6 sm:px-12 py-12 text-center text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-16 -start-16 h-56 w-56 rounded-full bg-white/10 blur-3xl"
            />
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">{t('ownerBannerTitle')}</h2>
            <p className="text-white/90 max-w-xl mx-auto mb-7">{t('ownerBannerDesc')}</p>
            <Link
              href={`/${locale}/salons/new`}
              className="inline-block rounded-full bg-white text-gray-900 px-7 py-3 font-semibold hover:bg-gray-100 transition"
            >
              {t('ownerBannerButton')}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowUpRight, Bell, CalendarCheck, Check, Gift, Search, Sparkles, Star, Tag, Zap } from 'lucide-react';
import SalonGrid from '@/components/SalonGrid';
import SalonMap from '@/components/SalonMap';
import FeaturedSalonsStrip from '@/components/FeaturedSalonsStrip';
import PublicHeader from '@/components/PublicHeader';
import { buttonClass } from '@/components/ui/Button';
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
  { key: 'feature1', Icon: Zap },
  { key: 'feature2', Icon: Gift },
  { key: 'feature3', Icon: Tag },
  { key: 'feature4', Icon: Bell },
] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const t = await getTranslations('Index');
  const salons = await getSalons();
  const featuredSalons = salons.filter((s) => s.isFeatured);
  const mapSalons = salons.map((s) => ({ id: s.id, name: s.name, city: s.city, lat: s.latitude, lng: s.longitude }));

  return (
    <>
      <PublicHeader locale={locale} />
      <main dir={dir}>
        {/* الواجهة: عنوان + بحث + بطاقة حجز توضيحية */}
        <section className="relative overflow-hidden bg-[#fcf8f9]">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_0%,rgba(180,69,107,0.13),transparent),radial-gradient(40%_40%_at_0%_100%,rgba(180,69,107,0.07),transparent)]" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 sm:pb-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-brand-100 text-brand-700 text-xs font-semibold ps-2.5 pe-3 py-1.5 mb-6 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" /> {t('heroBadge')}
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold tracking-tight text-stone-900 leading-[1.15] mb-5">
                <span className="text-brand-600">{t('heroTitleHighlight')}</span> {t('heroTitleRest')}
              </h1>
              <p className="text-lg text-stone-600 max-w-xl mb-8 leading-relaxed">{t('heroSubtitle')}</p>

              <form action={`/${locale}/salons`} method="get" className="flex items-center gap-2 bg-white rounded-2xl border border-stone-200 shadow-[0_8px_30px_-12px_rgba(74,23,48,0.18)] p-2 max-w-xl">
                <Search className="h-5 w-5 text-stone-400 ms-2.5 shrink-0" strokeWidth={1.8} />
                <input name="q" placeholder={t('heroSearchPlaceholder')} className="flex-1 min-w-0 h-11 bg-transparent text-stone-900 placeholder:text-stone-400 focus:outline-none" />
                <button type="submit" className={buttonClass('primary', 'md', 'shrink-0')}>
                  {t('heroSearchButton')}
                </button>
              </form>

              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600">
                {(['trust1', 'trust2', 'trust3'] as const).map((k) => (
                  <li key={k} className="flex items-center gap-1.5">
                    <span className="h-5 w-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {t(k)}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href={`/${locale}/salons`} className={buttonClass('dark', 'lg')}>
                  {t('ctaDiscover')}
                </Link>
                <Link href={`/${locale}/salons/new`} className={buttonClass('secondary', 'lg')}>
                  {t('ctaOwner')}
                </Link>
              </div>
            </div>

            {/* بطاقة حجز توضيحية (تزيينية) */}
            <div aria-hidden className="relative hidden lg:block">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-200/50 to-transparent blur-2xl" />
              <div className="relative rounded-3xl bg-white border border-stone-200 shadow-[0_24px_60px_-20px_rgba(74,23,48,0.3)] p-6 max-w-sm ms-auto rotate-[-2deg] rtl:rotate-[2deg]">
                <div className="flex items-center gap-3">
                  <span className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-white flex items-center justify-center text-lg font-semibold">{t('mockSalon').charAt(0)}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-stone-900">{t('mockSalon')}</p>
                    <p className="text-xs text-stone-500">{t('mockService')}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 text-amber-700 px-2 py-1 text-xs font-semibold">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 4.9
                  </span>
                </div>
                <p className="mt-5 text-xs font-medium text-stone-400">{t('mockToday')}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {['10:00', '11:30', '13:00', '14:30', '16:00', '17:30'].map((s, i) => (
                    <span key={s} className={`h-10 rounded-xl flex items-center justify-center text-sm font-medium tabular-nums ${i === 1 ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30' : 'bg-stone-50 text-stone-600 border border-stone-100'}`}>
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
                  <span className="text-sm text-stone-500">BHD</span>
                  <span className="text-xl font-semibold text-stone-900 tabular-nums">12.000</span>
                </div>
                <div className={`${buttonClass('primary', 'lg')} w-full mt-4`}>
                  <CalendarCheck className="h-5 w-5" /> {t('mockBook')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* المزايا */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ key, Icon }) => (
              <div key={key} className="group rounded-2xl border border-stone-200/80 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(74,23,48,0.15)]">
                <span className="h-11 w-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <h3 className="font-semibold text-stone-900 mb-1.5">{t(`${key}Title` as 'feature1Title')}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{t(`${key}Desc` as 'feature1Desc')}</p>
              </div>
            ))}
          </div>
        </section>

        {/* الصالونات */}
        <div className="bg-[#f8f6f7] border-y border-stone-200/70 px-4 sm:px-6 py-14">
          {featuredSalons.length > 0 && (
            <section className="max-w-6xl mx-auto mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-6">{t('featuredSalonsTitle')}</h2>
              <FeaturedSalonsStrip locale={locale} salons={featuredSalons} />
            </section>
          )}

          <section className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">{t('availableSalonsTitle')}</h2>
            {mapSalons.some((s) => s.lat && s.lng) && (
              <div className="mb-6 bg-white p-2 rounded-2xl border border-stone-200/80">
                <SalonMap salons={mapSalons} />
              </div>
            )}
            <SalonGrid locale={locale} salons={salons} />
          </section>
        </div>

        {/* كيف يعمل */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-stone-900">{t('stepsTitle')}</h2>
            <p className="text-stone-500 mt-2">{t('stepsSubtitle')}</p>
          </div>
          <ol className="grid md:grid-cols-3 gap-6">
            {(['step1', 'step2', 'step3'] as const).map((k, i) => (
              <li key={k} className="relative rounded-2xl border border-stone-200/80 bg-white p-7">
                <span className="absolute -top-4 start-7 h-8 w-8 rounded-full bg-brand-600 text-white text-sm font-semibold flex items-center justify-center shadow-md shadow-brand-600/30">{i + 1}</span>
                <h3 className="text-lg font-semibold text-stone-900 mt-2 mb-1.5">{t(`${k}Title`)}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{t(`${k}Desc`)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* دعوة لأصحاب الصالونات */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 sm:px-12 py-14 text-center text-white">
            <div aria-hidden className="pointer-events-none absolute -top-20 -end-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -start-16 h-64 w-64 rounded-full bg-brand-300/20 blur-3xl" />
            <h2 className="relative text-2xl sm:text-3xl font-bold mb-3">{t('ownerBannerTitle')}</h2>
            <p className="relative text-white/85 max-w-xl mx-auto mb-8">{t('ownerBannerDesc')}</p>
            <Link href={`/${locale}/salons/new`} className="relative inline-flex items-center gap-2 rounded-xl bg-white text-brand-800 px-7 h-12 font-semibold hover:bg-brand-50 transition-colors">
              {t('ownerBannerButton')} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

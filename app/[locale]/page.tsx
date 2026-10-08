import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowUpRight, Bot, CalendarCheck, Check, Compass, FileBarChart, Inbox, MessageCircle, Sparkles } from 'lucide-react';
import PublicHeader from '@/components/PublicHeader';
import { buttonClass } from '@/components/ui/Button';
import { getPlatformSettings } from '@/lib/platformSettings';
import { TRIAL_DAYS } from '@/lib/plans';

export const dynamic = 'force-dynamic';

async function trialDays() {
  try {
    return (await getPlatformSettings()).trialDays;
  } catch {
    return TRIAL_DAYS;
  }
}

const FEATURES = [
  { k: 'f1', Icon: Inbox, soon: false },
  { k: 'f2', Icon: Bot, soon: true },
  { k: 'f3', Icon: CalendarCheck, soon: false },
  { k: 'f4', Icon: FileBarChart, soon: false },
] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const t = await getTranslations('Landing');
  const days = await trialDays();

  return (
    <>
      <PublicHeader locale={locale} />
      <main dir={dir}>
        {/* الواجهة: عرض موجّه لأصحاب الصالونات + محادثة واتساب توضيحية */}
        <section className="relative overflow-hidden bg-[#fcf8f9]">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_90%_0%,rgba(180,69,107,0.14),transparent),radial-gradient(45%_45%_at_0%_100%,rgba(180,69,107,0.08),transparent)]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(74,23,48,0.12)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 sm:pb-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-brand-100 text-brand-700 text-xs font-semibold ps-2.5 pe-3 py-1.5 mb-6 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" /> {t('badge')}
              </span>
              <h1 className="text-[40px] sm:text-6xl lg:text-[64px] font-bold tracking-tight text-stone-900 leading-[1.1] mb-5">
                {t('titleA')} <span className="text-brand-600">{t('titleB')}</span>
              </h1>
              <p className="text-lg text-stone-600 max-w-xl mb-9 leading-relaxed">{t('sub')}</p>

              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/${locale}/salons/new`} className={buttonClass('primary', 'lg')}>
                  {t('ctaPrimary')} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
                </Link>
                <Link href={`/${locale}/login`} className={buttonClass('secondary', 'lg')}>
                  {t('ctaSecondary')}
                </Link>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-stone-500">
                <span className="h-5 w-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {t('trialNote', { days })}
              </p>
            </div>

            {/* محادثة واتساب توضيحية (تزيينية) */}
            <div aria-hidden className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-200/60 to-transparent blur-2xl" />
              <div className="relative mx-auto w-full max-w-sm rounded-[2rem] border border-stone-200 bg-white shadow-[0_30px_70px_-25px_rgba(74,23,48,0.35)] overflow-hidden">
                <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3.5 text-white">
                  <span className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold leading-tight">Salon AI</p>
                    <p className="text-[11px] text-white/70">WhatsApp</p>
                  </div>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium">{t('agentLabel')} · {t('soon')}</span>
                </div>
                <div className="space-y-2.5 bg-[#efe9e4] px-3.5 py-5 min-h-[330px] [background-image:radial-gradient(rgba(0,0,0,0.04)_1px,transparent_1px)] [background-size:16px_16px]">
                  <div className="max-w-[80%] rounded-2xl rounded-ss-md bg-white px-3.5 py-2 text-[13px] text-stone-800 shadow-sm">{t('chat1')}</div>
                  <div className="ms-auto max-w-[82%] rounded-2xl rounded-se-md bg-[#d9fdd3] px-3.5 py-2 text-[13px] text-stone-800 shadow-sm">{t('chat2')}</div>
                  <div className="max-w-[40%] rounded-2xl rounded-ss-md bg-white px-3.5 py-2 text-[13px] text-stone-800 shadow-sm tabular-nums">{t('chat3')}</div>
                  <div className="ms-auto max-w-[84%] rounded-2xl rounded-se-md bg-[#d9fdd3] px-3.5 py-2 text-[13px] text-stone-800 shadow-sm">{t('chat4')}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* المزايا */}
        <section id="features" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">{t('featuresTitle')}</h2>
            <p className="text-stone-500 mt-3">{t('featuresSub')}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map(({ k, Icon, soon }) => (
              <div key={k} className="group relative rounded-2xl border border-stone-200/80 bg-white p-7 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgba(74,23,48,0.18)]">
                <div className="flex items-start gap-4">
                  <span className="h-12 w-12 shrink-0 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center transition-colors group-hover:bg-brand-600 group-hover:text-white">
                    <Icon className="h-6 w-6" strokeWidth={1.7} />
                  </span>
                  <div>
                    <h3 className="font-semibold text-lg text-stone-900 flex items-center gap-2">
                      {t(`${k}t`)}
                      {soon && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-100">{t('soon')}</span>}
                    </h3>
                    <p className="mt-1.5 text-sm text-stone-500 leading-relaxed">{t(`${k}d`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* لقطة اللوحة */}
        <section className="bg-[#f8f6f7] border-y border-stone-200/70 py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">{t('dashTitle')}</h2>
              <p className="text-stone-500 mt-3">{t('dashSub')}</p>
            </div>
            <div aria-hidden className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-6 shadow-[0_30px_70px_-30px_rgba(74,23,48,0.3)]">
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {[
                  [t('dashA'), '12', '+8%'],
                  [t('dashB'), '1,240', '+12%'],
                  [t('dashC'), '7', ''],
                ].map(([label, val, delta]) => (
                  <div key={label} className="rounded-2xl border border-stone-200/80 p-3 sm:p-5">
                    <p className="text-[11px] sm:text-sm text-stone-500">{label}</p>
                    <p className="mt-1.5 text-xl sm:text-3xl font-semibold text-stone-900 tabular-nums">{val}</p>
                    {delta && <span className="mt-1.5 inline-block rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">▲ {delta}</span>}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex h-36 sm:h-44 items-end gap-2 rounded-2xl bg-stone-50 p-4 sm:p-5">
                {[38, 55, 42, 70, 52, 88, 64, 76, 58, 92, 68, 80].map((h, i) => (
                  <span key={i} className={`flex-1 rounded-t-md ${i === 9 ? 'bg-brand-600' : 'bg-brand-200'}`} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* كيف تعمل */}
        <section id="how" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">{t('stepsTitle')}</h2>
          </div>
          <ol className="grid md:grid-cols-3 gap-6">
            {(['s1', 's2', 's3'] as const).map((k, i) => (
              <li key={k} className="relative rounded-2xl border border-stone-200/80 bg-white p-7 pt-9">
                <span className="absolute -top-4 start-7 h-9 w-9 rounded-full bg-brand-600 text-white font-semibold flex items-center justify-center shadow-md shadow-brand-600/30">{i + 1}</span>
                <h3 className="text-lg font-semibold text-stone-900 mb-1.5">{t(`${k}t`)}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{t(`${k}d`)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* الدعوة الختامية */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 sm:px-12 py-16 text-center text-white">
            <div aria-hidden className="pointer-events-none absolute -top-20 -end-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -start-16 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl" />
            <h2 className="relative text-3xl sm:text-4xl font-bold mb-3 tracking-tight">{t('finalTitle')}</h2>
            <p className="relative text-white/85 max-w-xl mx-auto mb-9">{t('finalDesc')}</p>
            <Link href={`/${locale}/salons/new`} className="relative inline-flex items-center gap-2 rounded-xl bg-white text-brand-800 px-8 h-12 font-semibold hover:bg-brand-50 transition-colors">
              {t('ctaPrimary')} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </section>

        {/* ميزة العميل الوحيدة: دليل الصالونات + واتساب */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200/80 bg-white px-6 py-5">
            <div className="flex items-center gap-3.5">
              <span className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Compass className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <div>
                <p className="font-semibold text-stone-900">{t('customerTitle')}</p>
                <p className="text-sm text-stone-500">{t('customerDesc')}</p>
              </div>
            </div>
            <Link href={`/${locale}/salons`} className={buttonClass('secondary', 'md')}>
              {t('customerCta')}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

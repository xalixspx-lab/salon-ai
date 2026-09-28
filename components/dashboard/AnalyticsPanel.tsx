import { getTranslations } from 'next-intl/server';
import { getMonthlyStats, growth } from '@/lib/analytics';

function GrowthBadge({ value, noData }: { value: number | null; noData: string }) {
  if (value === null) return <span className="text-xs text-stone-400">{noData}</span>;
  const up = value >= 0;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`} dir="ltr">
      {up ? '▲' : '▼'} {Math.abs(value)}%
    </span>
  );
}

export default async function AnalyticsPanel({
  tenantId,
  timezone,
  currency,
  locale,
}: {
  tenantId: string;
  timezone: string | null;
  currency: string;
  locale: string;
}) {
  const t = await getTranslations('Analytics');
  const { series, thisMonth, lastMonth, topServices, weekdayCounts } = await getMonthlyStats(tenantId, timezone);

  const maxRevenue = Math.max(1, ...series.map((s) => s.revenue));
  const maxWeekday = Math.max(1, ...weekdayCounts);
  const monthName = (key: string) =>
    new Date(`${key}-01T12:00:00Z`).toLocaleDateString(locale === 'ar' ? 'ar-BH' : 'en-GB', { month: 'short', timeZone: 'UTC' });
  const weekdayNames = [0, 1, 2, 3, 4, 5, 6].map((d) =>
    new Date(Date.UTC(2026, 0, 4 + d, 12)).toLocaleDateString(locale === 'ar' ? 'ar-BH' : 'en-GB', { weekday: 'short', timeZone: 'UTC' })
  );

  const cards = [
    { label: t('bookings'), value: thisMonth.bookings, prev: lastMonth.bookings },
    { label: t('revenue'), value: thisMonth.revenue, prev: lastMonth.revenue, money: true },
    { label: t('newCustomers'), value: thisMonth.newCustomers, prev: lastMonth.newCustomers },
    { label: t('cancellations'), value: thisMonth.cancelled, prev: lastMonth.cancelled, invert: true },
  ];

  return (
    <section className="mb-8 space-y-6">
      <h2 className="text-lg font-bold text-stone-900">{t('title')}</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const g = growth(c.value, c.prev);
          return (
            <div key={c.label} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
              <p className="text-sm text-stone-500 mb-1">{c.label}</p>
              <p className="text-2xl font-extrabold text-stone-900">
                {c.money ? `${c.value.toFixed(3)} ${currency}` : c.value}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <GrowthBadge value={g === null || !c.invert ? g : g === 0 ? 0 : -g} noData={t('noPrevious')} />
                <span className="text-xs text-stone-400">{t('vsLastMonth')}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-sm font-semibold text-stone-700 mb-4">{t('revenueTrend')}</p>
          <div className="flex items-end gap-3 h-36" dir="ltr">
            {series.map((s) => (
              <div key={s.label} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[10px] text-stone-500 mb-1">{s.revenue > 0 ? s.revenue.toFixed(0) : ''}</span>
                <div
                  className="w-full rounded-t-md bg-brand-500/80"
                  style={{ height: `${Math.max(2, (s.revenue / maxRevenue) * 100)}%` }}
                />
                <span className="text-[11px] text-stone-500 mt-1">{monthName(s.label)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-sm font-semibold text-stone-700 mb-3">{t('topServices')}</p>
          {topServices.length === 0 ? (
            <p className="text-sm text-stone-400">{t('noData')}</p>
          ) : (
            <ul className="space-y-2">
              {topServices.map((s, i) => (
                <li key={i} className="flex justify-between text-sm text-stone-700">
                  <span>{(s.name && (s.name[locale] || s.name.ar || s.name.en)) || '—'}</span>
                  <span className="font-semibold">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
        <p className="text-sm font-semibold text-stone-700 mb-3">{t('busiestDays')}</p>
        <div className="flex items-end gap-3 h-24" dir="ltr">
          {weekdayCounts.map((n, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-[10px] text-stone-500 mb-1">{n || ''}</span>
              <div className="w-full rounded-t-md bg-stone-800/70" style={{ height: `${Math.max(2, (n / maxWeekday) * 100)}%` }} />
              <span className="text-[11px] text-stone-500 mt-1">{weekdayNames[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

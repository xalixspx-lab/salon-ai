'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PLANS, PAID_PLAN_KEYS, type PaidPlanKey } from '@/lib/plans';

interface Sub {
  plan: 'TRIAL' | PaidPlanKey;
  onTrial: boolean;
  trialExpired: boolean;
  trialDaysLeft: number;
  staffCount: number;
  prices: Record<PaidPlanKey, number>;
}

export default function SubscriptionPage() {
  const t = useTranslations('Subscription');
  const common = useTranslations('Common');
  const [sub, setSub] = useState<Sub | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/dashboard/subscription');
    const d = await res.json();
    if (d.success) setSub(d.data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const choose = async (plan: PaidPlanKey) => {
    setBusy(plan);
    setError('');
    const res = await fetch('/api/dashboard/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const d = await res.json();
    if (!res.ok) setError(d.error || 'Failed');
    await load();
    setBusy(null);
  };

  if (!sub) return <p className="text-center text-stone-400 text-sm py-10">...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">{t('title')}</h1>

      {sub.plan === 'TRIAL' && (
        <div
          className={`mb-6 rounded-2xl border p-4 text-sm ${
            sub.trialExpired ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {sub.trialExpired ? t('trialExpired') : t('trialActive', { days: sub.trialDaysLeft })}
        </div>
      )}

      <div className="mb-6 rounded-xl bg-stone-100 px-4 py-3 text-xs text-stone-600">{t('billingNotice')}</div>
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PAID_PLAN_KEYS.map((key) => {
          const p = PLANS[key];
          const current = sub.plan === key;
          const tooManyStaff = p.maxStaff !== null && sub.staffCount > p.maxStaff;
          return (
            <div key={key} className={`rounded-2xl border bg-white p-6 shadow-sm ${current ? 'border-brand-500 ring-2 ring-brand-200' : 'border-stone-200'}`}>
              <h2 className="text-lg font-bold text-stone-900">{t(`plan_${key}`)}</h2>
              <p className="mt-2 text-3xl font-extrabold text-stone-900">
                {sub.prices?.[key] ?? p.priceBhdMonthly} <span className="text-sm font-medium text-stone-500">{common('currency')} / {t('perMonth')}</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-stone-600">
                <li>✓ {p.maxStaff === null ? t('unlimitedStaff') : t('staffUpTo', { n: p.maxStaff })}</li>
                <li className={p.offers ? '' : 'text-stone-300 line-through'}>{p.offers ? '✓' : '✕'} {t('featureOffers')}</li>
                <li className={p.analytics ? '' : 'text-stone-300 line-through'}>{p.analytics ? '✓' : '✕'} {t('featureAnalytics')}</li>
                <li>✓ {t('featureBooking')}</li>
              </ul>
              {tooManyStaff && <p className="mt-3 text-xs text-amber-700">{t('staffOverLimit', { n: sub.staffCount })}</p>}
              <button
                disabled={current || busy !== null}
                onClick={() => choose(key)}
                className="mt-5 w-full rounded-md bg-brand-600 py-2 text-sm font-medium text-white disabled:bg-stone-200 disabled:text-stone-500"
              >
                {current ? t('currentPlan') : busy === key ? '...' : t('choose')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

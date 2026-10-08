'use client';

import { useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import HoneypotField from '@/components/HoneypotField';
import TurnstileWidget from '@/components/TurnstileWidget';
import LegalCheckbox from '@/components/LegalCheckbox';

export default function AccountRegisterPage() {
  const t = useTranslations('Account');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref') || '';
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/account/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, website, turnstileToken, acceptTerms, marketingOptIn, ref }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      router.push(`/${locale}/account`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 via-white to-white px-4">
      <div className="max-w-md w-full bg-white shadow-xl shadow-brand-900/5 rounded-2xl border border-brand-100 p-8 text-black">
        <h1 className="text-2xl font-bold mb-1 text-gray-900">{t('registerTitle')}</h1>
        <p className="text-sm text-gray-500 mb-4">{t('registerSubtitle')}</p>

        {ref && (
          <div className="mb-4 flex items-center gap-2 bg-gold-500/10 border border-gold-500/30 rounded-xl px-3 py-2.5 text-sm text-gold-600">
            🎁 {t('invitedNotice')}
          </div>
        )}

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <HoneypotField value={website} onChange={setWebsite} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('yourName')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" className="w-full px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-left focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} dir="ltr" className="w-full px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-left focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400" />
          </div>

          <LegalCheckbox kind="customer" checked={acceptTerms} onChange={setAcceptTerms} />
          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-1" />
            <span>{locale === 'ar' ? 'أرغب باستلام العروض والتحديثات (اختياري)' : 'I would like to receive offers and updates (optional)'}</span>
          </label>

          <TurnstileWidget onVerify={setTurnstileToken} />

          <button type="submit" disabled={loading} className="w-full bg-brand-600 text-white py-2.5 px-4 rounded-xl font-semibold hover:bg-brand-700 transition disabled:opacity-50">
            {loading ? '...' : t('createAccount')}
          </button>

          <p className="text-center text-sm text-gray-500">
            {t('haveAccount')}{' '}
            <a href={`/${locale}/account/login`} className="text-brand-600 font-medium hover:underline">
              {t('loginLink')}
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

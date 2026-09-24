'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import HoneypotField from '@/components/HoneypotField';
import TurnstileWidget from '@/components/TurnstileWidget';
import LegalCheckbox from '@/components/LegalCheckbox';

export default function AccountRegisterPage() {
  const t = useTranslations('Account');
  const router = useRouter();
  const params = useParams();
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
        body: JSON.stringify({ name, email, password, website, turnstileToken, acceptTerms, marketingOptIn }),
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-md rounded-lg border border-gray-100 p-8 text-black">
        <h1 className="text-2xl font-bold mb-1 text-gray-800">{t('registerTitle')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('registerSubtitle')}</p>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <HoneypotField value={website} onChange={setWebsite} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('yourName')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" className="w-full px-3 py-2 border rounded-md text-left" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} dir="ltr" className="w-full px-3 py-2 border rounded-md text-left" />
          </div>

          <LegalCheckbox kind="customer" checked={acceptTerms} onChange={setAcceptTerms} />
          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-1" />
            <span>{locale === 'ar' ? 'أرغب باستلام العروض والتحديثات (اختياري)' : 'I would like to receive offers and updates (optional)'}</span>
          </label>

          <TurnstileWidget onVerify={setTurnstileToken} />

          <button type="submit" disabled={loading} className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition disabled:opacity-50">
            {loading ? '...' : t('createAccount')}
          </button>

          <p className="text-center text-sm text-gray-500">
            {t('haveAccount')}{' '}
            <a href={`/${locale}/account/login`} className="text-blue-600 font-medium hover:underline">
              {t('loginLink')}
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

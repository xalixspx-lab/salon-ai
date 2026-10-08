'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

// نموذج دخول واحد لصاحب الصالون والعميل معًا؛ الخادم يتعرّف على نوع الحساب
// من البريد ويرجع role فنوجّه للوحة الصحيحة دون أن يعرف الزائر أي رابط يفتح.
export default function UnifiedLoginForm() {
  const t = useTranslations('Account');
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسجيل الدخول');

      const dest = data.role === 'owner' ? `/${locale}/dashboard` : `/${locale}/account`;
      router.push(dest);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 via-white to-white px-4">
      <div className="max-w-md w-full bg-white shadow-xl shadow-brand-900/5 rounded-2xl border border-brand-100 p-8">
        <h1 className="text-2xl font-bold mb-1 text-gray-900">{t('loginTitle')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('loginSubtitle')}</p>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
              className="w-full px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-left focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              dir="ltr"
              className="w-full px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-left focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400"
            />
          </div>

          <p className="text-sm">
            <a href={`/${locale}/forgot-password`} className="text-brand-600 hover:underline">
              {locale === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
            </a>
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-2.5 px-4 rounded-xl font-semibold hover:bg-brand-700 transition disabled:opacity-50"
          >
            {loading ? '...' : t('login')}
          </button>

          <p className="text-center text-sm text-gray-500">
            {t('noAccount')}{' '}
            <a href={`/${locale}/account/register`} className="text-brand-600 font-medium hover:underline">
              {t('registerLink')}
            </a>
          </p>
          <p className="text-center text-xs text-gray-400">
            <a href={`/${locale}/salons/new`} className="hover:underline">
              {t('registerSalonLink')}
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

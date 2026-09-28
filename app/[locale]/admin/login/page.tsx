'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function AdminLoginPage() {
  const t = useTranslations('Admin');
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
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      router.push(`/${locale}/admin`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-slate-800 shadow-xl rounded-2xl border border-slate-700 p-8 text-white">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 text-gold-400 text-xs font-semibold px-3 py-1 mb-4">
          {locale === 'ar' ? 'لوحة إدارة المنصة' : 'Platform admin'}
        </div>
        <h1 className="text-2xl font-bold mb-6 text-white">{t('loginTitle')}</h1>

        {error && <div className="mb-4 p-3 bg-red-500/10 text-red-300 rounded-xl text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">{t('email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" className="w-full px-3 py-2 rounded-xl text-left border border-slate-600 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-gold-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">{t('password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" className="w-full px-3 py-2 rounded-xl text-left border border-slate-600 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-gold-500" />
          </div>

          <p className="text-sm">
            <a href={`/${locale}/forgot-password?audience=admin`} className="text-gold-400 hover:underline">
              {locale === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
            </a>
          </p>

          <button type="submit" disabled={loading} className="w-full bg-gold-500 text-slate-900 py-2.5 px-4 rounded-xl font-semibold hover:bg-gold-400 transition disabled:opacity-50">
            {loading ? '...' : t('login')}
          </button>
        </form>
      </div>
    </div>
  );
}

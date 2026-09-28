'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function ChangePasswordForm({ locale, forced }: { locale: string; forced: boolean }) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || 'Failed');
    setDone(true);
    router.push(`/${locale}/admin`);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full bg-slate-800 shadow-xl rounded-2xl border border-slate-700 p-8 text-white">
        <h1 className="text-2xl font-bold mb-2 text-white">{t('changePassword')}</h1>
        {forced && <p className="mb-4 rounded-xl bg-gold-500/10 p-3 text-sm text-gold-300">{t('mustChangeNotice')}</p>}
        {error && <div className="mb-4 p-3 bg-red-500/10 text-red-300 rounded-xl text-sm">{error}</div>}
        {done && <div className="mb-4 p-3 bg-emerald-500/10 text-emerald-300 rounded-xl text-sm">{t('passwordChanged')}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">{t('currentPassword')}</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required dir="ltr" className="w-full px-3 py-2 rounded-xl text-left border border-slate-600 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-gold-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">{t('newPassword')}</label>
            <input type="password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required dir="ltr" className="w-full px-3 py-2 rounded-xl text-left border border-slate-600 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-gold-500" />
          </div>
          <button disabled={busy} className="w-full bg-gold-500 text-slate-900 py-2.5 rounded-xl font-semibold hover:bg-gold-400 transition disabled:opacity-50">
            {busy ? '...' : t('changePassword')}
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';

export default function ChangePasswordCard() {
  const t = useTranslations('Account');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setDone(false);
    const res = await fetch('/api/account/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || 'Failed');
    setDone(true);
    setCurrent('');
    setNext('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">{t('changePassword')}</h2>
      {error && <div className="mb-3 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
      {done && <div className="mb-3 p-3 bg-emerald-50 text-emerald-700 rounded text-sm">{t('passwordChanged')}</div>}
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('currentPassword')}</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required dir="ltr" className="w-full px-3 py-2 border rounded-md text-black text-left" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('newPassword')}</label>
          <input type="password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required dir="ltr" className="w-full px-3 py-2 border rounded-md text-black text-left" />
        </div>
        <button disabled={busy} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
          {busy ? '...' : t('changePassword')}
        </button>
      </form>
    </div>
  );
}

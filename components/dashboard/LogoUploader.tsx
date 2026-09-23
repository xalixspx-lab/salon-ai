'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function LogoUploader({ initialUrl }: { initialUrl: string | null }) {
  const t = useTranslations('Settings');
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/dashboard/logo', { method: 'POST', body: form });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setError(d.error || 'Failed');
    else setUrl(d.data.logoUrl);
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    await fetch('/api/dashboard/logo', { method: 'DELETE' });
    setUrl(null);
    setBusy(false);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-2">{t('logo')}</label>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center text-stone-300 text-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={url} alt={t('logo')} className="h-full w-full object-cover" /> : '🖼️'}
        </div>
        <div className="space-y-2">
          <label className={`inline-block cursor-pointer rounded-md bg-purple-600 px-3 py-1.5 text-sm text-white ${busy ? 'opacity-50' : ''}`}>
            {busy ? '...' : url ? t('changeLogo') : t('uploadLogo')}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={busy}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
          {url && (
            <button type="button" onClick={remove} disabled={busy} className="block text-xs text-red-600 hover:underline">
              {t('removeLogo')}
            </button>
          )}
          <p className="text-xs text-stone-500">{t('logoHint')}</p>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

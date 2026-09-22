'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Photo {
  id: string;
  url: string;
}

export default function GalleryManager() {
  const t = useTranslations('Settings');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/dashboard/gallery');
    const d = await res.json();
    if (d.success) setPhotos(d.data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/dashboard/gallery', { method: 'POST', body: form });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setError(d.error || 'Failed');
    await load();
    setBusy(false);
  };

  const remove = async (id: string) => {
    setBusy(true);
    await fetch(`/api/dashboard/gallery/${id}`, { method: 'DELETE' });
    await load();
    setBusy(false);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-2">{t('gallery')}</label>
      <p className="text-xs text-stone-500 mb-3">{t('galleryHint')}</p>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(p.id)}
              disabled={busy}
              className="absolute top-1 left-1 bg-black/60 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              ✕
            </button>
          </div>
        ))}
        {photos.length < 12 && (
          <label className={`aspect-square rounded-xl border-2 border-dashed border-stone-300 flex items-center justify-center text-2xl text-stone-400 cursor-pointer hover:border-purple-400 ${busy ? 'opacity-50' : ''}`}>
            +
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={busy}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-stone-400">{photos.length}/12</p>
    </div>
  );
}

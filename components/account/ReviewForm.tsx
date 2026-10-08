'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function ReviewForm({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations('Account');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    const res = await fetch('/api/account/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId, rating, comment }),
    });
    const d = await res.json();
    if (!res.ok) setError(d.error || 'Failed');
    else router.refresh();
    setBusy(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-amber-700 hover:underline">
        ★ {t('rateVisit')}
      </button>
    );
  }

  return (
    <div className="space-y-2 min-w-48">
      <div className="flex gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} className={`text-xl ${n <= rating ? 'text-amber-500' : 'text-gray-300'}`} aria-label={`${n}`}>
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder={t('reviewPlaceholder')}
        className="w-full border rounded px-2 py-1 text-xs text-black"
      />
      <div className="flex gap-2">
        <button disabled={busy || rating === 0} onClick={submit} className="text-xs bg-brand-600 text-white px-2 py-1 rounded disabled:opacity-40">
          {t('submitReview')}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-500 underline">
          {t('back')}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

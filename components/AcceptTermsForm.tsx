'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LegalCheckbox from '@/components/LegalCheckbox';

export default function AcceptTermsForm({ audience, locale }: { audience: 'owner' | 'customer'; locale: string }) {
  const router = useRouter();
  const ar = locale === 'ar';
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res =
      audience === 'owner'
        ? await fetch('/api/dashboard/accept-agreement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accept: true }),
          })
        : await fetch('/api/account/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'DATA_PROCESSING', granted: true }),
          });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Failed');
    router.push(`/${locale}/${audience === 'owner' ? 'dashboard' : 'account'}`);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir={ar ? 'rtl' : 'ltr'}>
      <form onSubmit={submit} className="max-w-md w-full bg-white shadow-md rounded-lg border border-gray-100 p-8 text-black space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">{ar ? 'مراجعة الشروط والموافقة' : 'Review and accept the terms'}</h1>
        <p className="text-sm text-gray-500">
          {ar
            ? 'قبل المتابعة يلزم الاطلاع على الوثائق القانونية الحالية والموافقة عليها.'
            : 'Before continuing you need to read and accept the current legal documents.'}
        </p>
        {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        <LegalCheckbox kind={audience === 'owner' ? 'salon' : 'customer'} checked={accepted} onChange={setAccepted} />
        <button disabled={!accepted || busy} className="w-full bg-black text-white py-2 rounded-md disabled:opacity-50">
          {busy ? '...' : ar ? 'أوافق وأتابع' : 'Accept and continue'}
        </button>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

// أدوات حقوق صاحب البيانات (PDPL): سحب/منح الموافقة التسويقية، تصدير البيانات، حذف الحساب
export default function PrivacyCard({ initialMarketing }: { initialMarketing: boolean }) {
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [marketing, setMarketing] = useState(initialMarketing);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleMarketing = async (v: boolean) => {
    setMarketing(v);
    const res = await fetch('/api/account/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'MARKETING', granted: v }),
    });
    if (!res.ok) setMarketing(!v);
  };

  const deleteAccount = async () => {
    setBusy(true);
    setMsg('');
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) return setMsg((await res.json().catch(() => ({}))).error || 'Failed');
    router.push(`/${locale}`);
    router.refresh();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">{L('الخصوصية والبيانات', 'Privacy & data')}</h2>

      <label className="flex items-start gap-2 text-sm text-gray-700 mb-4">
        <input type="checkbox" checked={marketing} onChange={(e) => toggleMarketing(e.target.checked)} className="mt-1" />
        <span>{L('أرغب باستلام العروض والتحديثات التسويقية', 'I want to receive marketing offers and updates')}</span>
      </label>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* تنزيل ملف من واجهة API، ليس تنقلًا بين صفحات */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/account/export" className="rounded-md border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          ⬇ {L('تنزيل نسخة من بياناتي', 'Download my data')}
        </a>
        {!confirming && (
          <button onClick={() => setConfirming(true)} className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50">
            {L('حذف حسابي', 'Delete my account')}
          </button>
        )}
      </div>

      {confirming && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm text-red-900">
            {L(
              'حذف نهائي لحسابك وتقييماتك ومفضلاتك، لا يمكن التراجع عنه. أدخل كلمة المرور للتأكيد:',
              'This permanently deletes your account, reviews and favourites and cannot be undone. Enter your password to confirm:'
            )}
          </p>
          {msg && <p className="text-sm text-red-700">{msg}</p>}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="w-full px-3 py-2 border rounded-md text-black text-left" />
          <div className="flex gap-2">
            <button disabled={!password || busy} onClick={deleteAccount} className="bg-red-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-40">
              {L('تأكيد الحذف', 'Confirm delete')}
            </button>
            <button
              onClick={() => {
                setConfirming(false);
                setPassword('');
                setMsg('');
              }}
              className="bg-white border px-4 py-2 rounded-md text-sm"
            >
              {L('رجوع', 'Back')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

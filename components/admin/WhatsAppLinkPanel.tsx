'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Linked = { phoneNumberId: string; wabaId: string | null; displayPhone: string | null; status: string; hasToken: boolean } | null;

// ربط رقم واتساب (Meta Cloud API) بالصالون من الإدارة. الرمز لا يُعرض بعد الحفظ.
export default function WhatsAppLinkPanel({ salonId }: { salonId: string }) {
  const params = useParams();
  const ar = params.locale !== 'en';
  const L = (a: string, e: string) => (ar ? a : e);

  const [linked, setLinked] = useState<Linked | undefined>(undefined);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/salons/${salonId}/whatsapp`).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (json?.success) {
      setLinked(json.data);
      if (json.data) {
        setPhoneNumberId(json.data.phoneNumberId);
        setWabaId(json.data.wabaId ?? '');
        setDisplayPhone(json.data.displayPhone ?? '');
      }
    }
  }, [salonId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setMsg('');
    const res = await fetch(`/api/admin/salons/${salonId}/whatsapp`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumberId, wabaId, displayPhone, accessToken }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    setBusy(false);
    if (json?.success) {
      setAccessToken('');
      setMsg(L('تم الحفظ', 'Saved'));
      load();
    } else setMsg(json?.error || L('فشل الحفظ', 'Save failed'));
  };

  const unlink = async () => {
    if (!window.confirm(L('فك ربط واتساب عن هذا الصالون؟', 'Unlink WhatsApp from this salon?'))) return;
    setBusy(true);
    await fetch(`/api/admin/salons/${salonId}/whatsapp`, { method: 'DELETE' }).catch(() => null);
    setBusy(false);
    setPhoneNumberId('');
    setWabaId('');
    setDisplayPhone('');
    setLinked(null);
    setMsg(L('تم فك الربط', 'Unlinked'));
  };

  const field = 'w-full px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 text-left';

  return (
    <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-800">🟢 {L('ربط واتساب (Meta Cloud API)', 'WhatsApp link (Meta Cloud API)')}</h2>
        {linked && (
          <span className={`text-xs px-2 py-1 rounded-full ${linked.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {linked.status === 'ACTIVE' ? L('مربوط', 'Linked') : L('معطّل', 'Disabled')}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">
        {L(
          'أدخل Phone number ID من لوحة Meta للرقم. الرمز اختياري (يُشفَّر ولا يُعرض بعد الحفظ)؛ وإن تُرك فارغًا يُستعمل رمز النظام.',
          'Enter the number\'s Phone number ID from the Meta dashboard. The token is optional (encrypted, never shown again); if empty the system token is used.'
        )}
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Phone number ID</label>
        <input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} dir="ltr" className={field} inputMode="numeric" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">WABA ID</label>
          <input value={wabaId} onChange={(e) => setWabaId(e.target.value)} dir="ltr" className={field} inputMode="numeric" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{L('الرقم المعروض', 'Display number')}</label>
          <input value={displayPhone} onChange={(e) => setDisplayPhone(e.target.value)} dir="ltr" className={field} placeholder="+973 3xxx xxxx" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Access token {linked?.hasToken && <span className="text-emerald-600 text-xs">({L('محفوظ', 'stored')})</span>}
        </label>
        <input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} dir="ltr" type="password" autoComplete="off" className={field} />
      </div>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy || !phoneNumberId} className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
          {L('حفظ', 'Save')}
        </button>
        {linked && (
          <button onClick={unlink} disabled={busy} className="border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm disabled:opacity-50">
            {L('فك الربط', 'Unlink')}
          </button>
        )}
      </div>
    </div>
  );
}

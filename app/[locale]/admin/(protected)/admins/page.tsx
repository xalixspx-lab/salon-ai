'use client';

import { useCallback, useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';

interface AdminRow {
  id: string;
  name: string;
  email: string;
  mustChangePassword: boolean;
  createdAt: string;
}

export default function AdminsPage() {
  const t = useTranslations('Admin');
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [me, setMe] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/admins');
    const d = await res.json();
    if (d.success) {
      setAdmins(d.data);
      setMe(d.currentAdminId);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    const d = await res.json();
    if (!res.ok) return setError(d.error || 'Failed');
    setTemp({ email: d.data.email, password: d.tempPassword });
    setName('');
    setEmail('');
    load();
  };

  const resetPw = async (a: AdminRow) => {
    const res = await fetch(`/api/admin/admins/${a.id}/reset-password`, { method: 'POST' });
    const d = await res.json();
    if (res.ok) setTemp({ email: a.email, password: d.tempPassword });
    else setError(d.error || 'Failed');
    load();
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/admin/admins/${id}`, { method: 'DELETE' });
    if (!res.ok) setError((await res.json()).error || 'Failed');
    setConfirmId(null);
    load();
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('admins')}</h1>
      <p className="text-sm text-slate-500 mb-6">{t('adminsHint')}</p>

      {temp && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mb-1">{t('tempPasswordNote')}</p>
          <p className="font-mono text-base select-all" dir="ltr">
            {temp.email} — {temp.password}
          </p>
          <button onClick={() => setTemp(null)} className="mt-2 text-xs underline">OK</button>
        </div>
      )}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <form onSubmit={add} className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder={t('adminName')} className="px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" placeholder={t('adminEmail')} className="px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 text-left" />
        <button className="bg-slate-900 text-white rounded-md px-4 py-2 text-sm">{t('addAdmin')}</button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-right text-sm text-slate-600">
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-b border-slate-100">
                <td className="p-3 font-medium text-slate-900">
                  {a.name} {a.id === me && <span className="text-xs text-emerald-700">({t('you')})</span>}
                  {a.mustChangePassword && <span className="ms-2 text-xs text-amber-700">⏳</span>}
                </td>
                <td className="p-3" dir="ltr">{a.email}</td>
                <td className="p-3">
                  {a.id !== me && (
                    <div className="flex items-center gap-3">
                      <button onClick={() => resetPw(a)} className="text-blue-600 hover:underline">{t('resetPassword')}</button>
                      {confirmId === a.id ? (
                        <>
                          <button onClick={() => remove(a.id)} className="text-red-700 font-semibold">{t('confirmDelete')}</button>
                          <button onClick={() => setConfirmId(null)} className="text-slate-500">{t('back')}</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmId(a.id)} className="text-red-600 hover:underline">{t('remove')}</button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

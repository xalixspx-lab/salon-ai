'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import ListToolbar from '@/components/admin/ListToolbar';

interface OwnerRow {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
  suspendedAt: string | null;
  createdAt: string | null;
  tenant: { id: string; name: string } | null;
}

export default function AdminOwnersPage() {
  const t = useTranslations('Admin');
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';
  const ar = locale !== 'en';

  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<{ ownerEmail: string; password: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [deleting, setDeleting] = useState<OwnerRow | null>(null);
  const [confirmEmail, setConfirmEmail] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/owners?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (data.success) setOwners(data.data);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  const handleReset = async (owner: OwnerRow) => {
    if (!confirm(t('resetPasswordConfirm'))) return;
    setBusyId(owner.id);
    const res = await fetch(`/api/admin/owners/${owner.id}/reset-password`, { method: 'POST' });
    const data = await res.json();
    if (data.success) setNewPassword({ ownerEmail: owner.email, password: data.newPassword });
    setBusyId(null);
  };

  const toggleSuspend = async (owner: OwnerRow) => {
    setBusyId(owner.id);
    setMsg('');
    const res = await fetch(`/api/admin/owners/${owner.id}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspend: !owner.suspendedAt }),
    });
    if (!res.ok) setMsg((await res.json()).error || 'Failed');
    setBusyId(null);
    load();
  };

  const resendVerification = async (owner: OwnerRow) => {
    setBusyId(owner.id);
    setMsg('');
    const res = await fetch(`/api/admin/owners/${owner.id}/resend-verification`, { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(d.error || 'Failed');
    else setMsg(d.alreadyVerified ? t('alreadyVerified') : t('verificationSent'));
    setBusyId(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const res = await fetch(`/api/admin/owners/${deleting.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmEmail }),
    });
    if (!res.ok) setMsg((await res.json()).error || 'Failed');
    else setDeleting(null);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('owners')}</h1>

      {newPassword && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <p className="font-medium text-amber-800 mb-1" dir="ltr">{newPassword.ownerEmail}</p>
          <p className="text-amber-700">{t('newPasswordGenerated')}</p>
          <code className="block mt-2 p-2 bg-white rounded border border-amber-200 text-black" dir="ltr">
            {newPassword.password}
          </code>
          <button onClick={() => setNewPassword(null)} className="mt-2 text-xs text-amber-700 hover:underline">
            {ar ? 'إغلاق' : 'Close'}
          </button>
        </div>
      )}
      {msg && <div className="mb-4 rounded bg-slate-100 border border-slate-200 p-3 text-sm text-slate-800 select-all">{msg}</div>}

      <ListToolbar q={q} onQ={setQ} exportType="owners" />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        {loading ? (
          <p className="p-6 text-center text-slate-400 text-sm">...</p>
        ) : owners.length === 0 ? (
          <p className="p-6 text-center text-slate-400 text-sm">—</p>
        ) : (
          <table className="w-full text-right text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase text-xs">
              <tr>
                <th className="p-3">{t('ownerName')}</th>
                <th className="p-3">{t('email')}</th>
                <th className="p-3">{t('salon')}</th>
                <th className="p-3">{t('status')}</th>
                <th className="p-3">{t('createdAt')}</th>
                <th className="p-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((owner) => (
                <tr key={owner.id} className="border-b border-slate-100">
                  <td className="p-3 font-medium text-slate-900">{owner.name}</td>
                  <td className="p-3" dir="ltr">{owner.email}</td>
                  <td className="p-3">{owner.tenant?.name || '—'}</td>
                  <td className="p-3 text-xs">
                    {owner.suspendedAt ? (
                      <span className="text-red-700">{t('suspended')}</span>
                    ) : owner.emailVerifiedAt ? (
                      <span className="text-emerald-700">{t('verified')}</span>
                    ) : (
                      <span className="text-amber-700">{t('unverified')}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {owner.createdAt ? new Date(owner.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US') : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-3 text-xs">
                      <button onClick={() => toggleSuspend(owner)} disabled={busyId === owner.id} className="text-slate-800 hover:underline disabled:opacity-50">
                        {owner.suspendedAt ? t('reactivate') : t('suspend')}
                      </button>
                      <button onClick={() => handleReset(owner)} disabled={busyId === owner.id} className="text-blue-600 hover:underline disabled:opacity-50">
                        {t('resetPassword')}
                      </button>
                      {!owner.emailVerifiedAt && (
                        <button onClick={() => resendVerification(owner)} disabled={busyId === owner.id} className="text-slate-800 hover:underline disabled:opacity-50">
                          {t('resendVerification')}
                        </button>
                      )}
                      <button onClick={() => { setDeleting(owner); setConfirmEmail(''); }} className="text-red-600 hover:underline">
                        {t('deleteOwner')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleting && (
        <div className="mt-6 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-900 mb-3">
            {t('deleteOwnerWarning')} <b dir="ltr">{deleting.email}</b>
          </p>
          <input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} dir="ltr" className="w-full px-3 py-2 border rounded-md text-black mb-3" />
          <div className="flex gap-2">
            <button
              disabled={confirmEmail.trim().toLowerCase() !== deleting.email}
              onClick={confirmDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-40"
            >
              {t('confirmDelete')}
            </button>
            <button onClick={() => setDeleting(null)} className="bg-white border px-4 py-2 rounded-md text-sm">{t('back')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

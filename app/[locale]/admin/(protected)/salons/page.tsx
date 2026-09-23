'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ListToolbar from '@/components/admin/ListToolbar';
import LocationPicker from '@/components/LocationPicker';

interface TenantRow {
  id: string;
  name: string;
  city: string | null;
  isPublished: boolean;
  plan: string;
  trialEndsAt: string | null;
  createdAt: string | null;
  owner: { email: string; name: string } | null;
}

const emptyForm = {
  name: '',
  city: '',
  addressText: '',
  phone: '',
  descriptionAr: '',
  descriptionEn: '',
  lat: '' as number | '',
  lng: '' as number | '',
  ownerName: '',
  email: '',
};

export default function AdminSalonsPage() {
  const t = useTranslations('Admin');
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';

  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TenantRow | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/salons?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (data.success) setTenants(data.data);
    setLoading(false);
  };

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    load();
  }, []);

  const confirmDelete = async () => {
    if (!deleting) return;
    const res = await fetch(`/api/admin/salons/${deleting.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmName }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setDeleteError(d.error || 'Failed');
      return;
    }
    setDeleting(null);
    await load();
  };

  const patchTenant = async (id: string, patch: Record<string, unknown>) => {
    await fetch(`/api/admin/salons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    await load();
  };

  const togglePublished = async (tenant: TenantRow) => {
    setTogglingId(tenant.id);
    await fetch(`/api/admin/salons/${tenant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !tenant.isPublished }),
    });
    await load();
    setTogglingId(null);
  };

  const addSalon = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');

    const res = await fetch('/api/admin/salons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (!res.ok) {
      setCreating(false);
      return setCreateError(d.error || 'Failed');
    }

    if (logoFile) {
      const fd = new FormData();
      fd.append('file', logoFile);
      await fetch(`/api/admin/salons/${d.data.tenant.id}/logo`, { method: 'POST', body: fd }).catch(() => {});
    }

    setTemp({ email: d.data.owner.email, password: d.tempPassword });
    setForm(emptyForm);
    setLogoFile(null);
    setShowForm(false);
    setCreating(false);
    await load();
  };

  const input = 'px-3 py-2 border rounded-md text-black w-full';

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('salons')}</h1>

      {temp && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mb-1">{t('newPasswordGenerated')}</p>
          <p className="font-mono text-base select-all" dir="ltr">{temp.email} — {temp.password}</p>
          <p className="text-xs text-amber-700 mt-1">{t('welcomeEmailSentNote')}</p>
          <button onClick={() => setTemp(null)} className="mt-2 text-xs underline">OK</button>
        </div>
      )}

      <button
        onClick={() => setShowForm((v) => !v)}
        className="mb-4 bg-slate-900 text-white rounded-md px-4 py-2 text-sm"
      >
        {showForm ? t('cancel') : t('addSalon')}
      </button>

      {showForm && (
        <form onSubmit={addSalon} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 space-y-4 max-w-2xl">
          {createError && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{createError}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={input} required placeholder={t('salonName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={input} placeholder={t('phone')} dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          <input className={input} placeholder={t('addressText') || 'العنوان'} value={form.addressText} onChange={(e) => setForm({ ...form, addressText: e.target.value })} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <textarea className={input} rows={2} placeholder={t('descriptionAr')} value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} />
            <textarea className={input} rows={2} dir="ltr" placeholder={t('descriptionEn')} value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} />
          </div>

          <LocationPicker
            city={form.city}
            onCityChange={(v) => setForm({ ...form, city: v })}
            lat={form.lat}
            lng={form.lng}
            onLatChange={(v) => setForm((f) => ({ ...f, lat: v }))}
            onLngChange={(v) => setForm((f) => ({ ...f, lng: v }))}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('logo')}</label>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="text-sm" />
          </div>

          <hr className="border-slate-100" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={input} required placeholder={t('ownerName')} value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
            <input type="email" className={input} required dir="ltr" placeholder={t('ownerEmail')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          <button type="submit" disabled={creating} className="bg-slate-900 text-white rounded-md px-4 py-2 text-sm disabled:opacity-50">
            {creating ? '...' : t('addSalon')}
          </button>
        </form>
      )}

      <ListToolbar q={q} onQ={setQ} exportType="salons" />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        {loading ? (
          <p className="p-6 text-center text-slate-400 text-sm">...</p>
        ) : tenants.length === 0 ? (
          <p className="p-6 text-center text-slate-400 text-sm">—</p>
        ) : (
          <table className="w-full text-right text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase text-xs">
              <tr>
                <th className="p-3">{t('salonName')}</th>
                <th className="p-3">{t('ownerEmail')}</th>
                <th className="p-3">{t('city')}</th>
                <th className="p-3">{t('status')}</th>
                <th className="p-3">{t('plan')}</th>
                <th className="p-3">{t('createdAt')}</th>
                <th className="p-3">{t('editSalon')}</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-slate-100">
                  <td className="p-3 font-medium text-slate-900">{tenant.name}</td>
                  <td className="p-3" dir="ltr">{tenant.owner?.email || '—'}</td>
                  <td className="p-3">{tenant.city || '—'}</td>
                  <td className="p-3">
                    <select
                      value={tenant.plan}
                      onChange={(e) => patchTenant(tenant.id, { plan: e.target.value })}
                      className="border rounded-md text-xs p-1 text-black"
                    >
                      <option value="TRIAL">TRIAL</option>
                      <option value="BASIC">BASIC</option>
                      <option value="PROFESSIONAL">PROFESSIONAL</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                    {tenant.plan === 'TRIAL' && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span>{tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : '—'}</span>
                        <button onClick={() => patchTenant(tenant.id, { extendTrialDays: 14 })} className="text-blue-600 hover:underline">+14d</button>
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => togglePublished(tenant)}
                      disabled={togglingId === tenant.id}
                      className={`text-xs px-2 py-1 rounded-md font-medium disabled:opacity-50 ${
                        tenant.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {tenant.isPublished ? t('published') : t('unpublished')}
                    </button>
                  </td>
                  <td className="p-3">
                    {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US') : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/${locale}/admin/salons/${tenant.id}`} className="text-slate-700 hover:underline">
                        {t('editSalon')}
                      </Link>
                      <button onClick={() => { setDeleting(tenant); setConfirmName(''); setDeleteError(''); }} className="text-red-600 hover:underline">
                        {t('deleteSalon')}
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
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 max-w-xl">
          <p className="text-sm text-red-900 mb-1 font-semibold">{deleting.name}</p>
          <p className="text-sm text-red-800 mb-3">{t('deleteWarning')}</p>
          {deleteError && <p className="text-sm text-red-700 mb-2">{deleteError}</p>}
          <input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-black mb-3"
          />
          <div className="flex gap-2">
            <button
              disabled={confirmName.trim() !== deleting.name.trim()}
              onClick={confirmDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-40"
            >
              {t('confirmDelete')}
            </button>
            <button onClick={() => setDeleting(null)} className="bg-white text-slate-700 px-4 py-2 rounded-md text-sm border">
              {t('back')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

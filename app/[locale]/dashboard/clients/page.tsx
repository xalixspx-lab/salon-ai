'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ClientRow {
  id: string;
  name: string;
  phone: string | null;
  totalVisits: number;
  lastVisit: string | null;
}

export default function ClientsPage() {
  const t = useTranslations('Clients');
  const common = useTranslations('Common');
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/dashboard/clients');
    const data = await res.json();
    if (data.success) setClients(data.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setError('');
  };

  const openEdit = (c: ClientRow) => {
    setEditingId(c.id);
    setName(c.name);
    setPhone(c.phone || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingId ? `/api/dashboard/clients/${editingId}` : '/api/dashboard/clients';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (locale === 'en' ? 'Save failed' : 'فشل الحفظ'));

      setShowForm(false);
      resetForm();
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === 'en' ? 'Delete this client?' : 'حذف هذا العميل؟')) return;
    await fetch(`/api/dashboard/clients/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-stone-900">{t('title')}</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-700 transition"
        >
          + {t('newClient')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-6 space-y-4">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border rounded-md text-black" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('phone')}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="w-full px-3 py-2 border rounded-md text-black text-left" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-brand-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
              {saving ? '...' : common('save')}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="bg-stone-100 text-stone-700 px-4 py-2 rounded-md text-sm">
              {common('cancel')}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-x-auto">
        {loading ? (
          <p className="p-6 text-center text-stone-400 text-sm">...</p>
        ) : clients.length === 0 ? (
          <p className="p-6 text-center text-stone-400 text-sm">{locale === 'en' ? 'No clients yet' : 'لا يوجد عملاء بعد'}</p>
        ) : (
          <table className="w-full text-right text-sm text-stone-600">
            <thead className="bg-stone-50 text-stone-700 uppercase text-xs">
              <tr>
                <th className="p-3">{t('name')}</th>
                <th className="p-3">{t('phone')}</th>
                <th className="p-3">{t('totalVisits')}</th>
                <th className="p-3">{t('lastVisit')}</th>
                <th className="p-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-stone-100">
                  <td className="p-3 font-medium text-stone-900">
                    <Link href={`/${locale}/dashboard/clients/${c.id}`} className="hover:text-brand-700 hover:underline">{c.name}</Link>
                  </td>
                  <td className="p-3" dir="ltr">{c.phone || '—'}</td>
                  <td className="p-3">
                    <span className="bg-brand-50 text-brand-700 text-xs px-2 py-1 rounded-full font-medium">
                      {c.totalVisits}
                    </span>
                  </td>
                  <td className="p-3">
                    {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US') : '—'}
                  </td>
                  <td className="p-3 flex gap-3">
                    <button onClick={() => openEdit(c)} className="text-brand-600 hover:underline">{common('edit')}</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline">{common('delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

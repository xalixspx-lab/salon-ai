'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import ServiceCombobox from '@/components/dashboard/ServiceCombobox';

interface ServiceRow {
  id: string;
  name: { ar?: string; en?: string } | null;
  basePrice: string | null;
  baseDurationMinutes: number | null;
}

export default function ServicesPage() {
  const t = useTranslations('Services');
  const common = useTranslations('Common');
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/dashboard/services');
    const data = await res.json();
    if (data.success) setServices(data.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setNameAr('');
    setNameEn('');
    setPrice('');
    setDuration('');
    setError('');
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (s: ServiceRow) => {
    setEditingId(s.id);
    setNameAr(s.name?.ar || '');
    setNameEn(s.name?.en || '');
    setPrice(s.basePrice || '');
    setDuration(s.baseDurationMinutes?.toString() || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingId ? `/api/dashboard/services/${editingId}` : '/api/dashboard/services';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameAr, nameEn, basePrice: price, baseDurationMinutes: duration }),
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
    if (!confirm(locale === 'en' ? 'Delete this service?' : 'حذف هذه الخدمة؟')) return;
    await fetch(`/api/dashboard/services/${id}`, { method: 'DELETE' });
    load();
  };

  const displayName = (s: ServiceRow) => (locale === 'ar' ? s.name?.ar : s.name?.en) || s.name?.ar || s.name?.en || '—';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-stone-900">{t('title')}</h1>
        <button
          onClick={openNew}
          className="bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-700 transition"
        >
          + {t('newService')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-6 space-y-4">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ServiceCombobox
              locale={locale}
              nameAr={nameAr}
              nameEn={nameEn}
              onChange={(ar, en) => { setNameAr(ar); setNameEn(en); }}
            />
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('price')} ({common('currency')})</label>
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('duration')} ({locale === 'en' ? 'minutes' : 'دقيقة'})</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" />
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
        ) : services.length === 0 ? (
          <p className="p-6 text-center text-stone-400 text-sm">{locale === 'en' ? 'No services yet' : 'لا توجد خدمات بعد'}</p>
        ) : (
          <table className="w-full text-right text-sm text-stone-600">
            <thead className="bg-stone-50 text-stone-700 uppercase text-xs">
              <tr>
                <th className="p-3">{t('serviceName')}</th>
                <th className="p-3">{t('price')}</th>
                <th className="p-3">{t('duration')}</th>
                <th className="p-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-b border-stone-100">
                  <td className="p-3 font-medium text-stone-900">{displayName(s)}</td>
                  <td className="p-3">{s.basePrice ? `${s.basePrice} ${common('currency')}` : '—'}</td>
                  <td className="p-3">{s.baseDurationMinutes ? `${s.baseDurationMinutes} ${locale === 'en' ? 'min' : 'دقيقة'}` : '—'}</td>
                  <td className="p-3 flex gap-3">
                    <button onClick={() => openEdit(s)} className="text-brand-600 hover:underline">{common('edit')}</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:underline">{common('delete')}</button>
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

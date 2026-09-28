'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import WeeklyHoursEditor, { initialHours } from '@/components/dashboard/WeeklyHoursEditor';
import type { WeeklyHours } from '@/lib/schedule';

interface StaffRow {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  status: string;
  workingHours: unknown;
}

export default function StaffPage() {
  const t = useTranslations('Staff');
  const common = useTranslations('Common');
  const settings = useTranslations('Settings');

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [ownHours, setOwnHours] = useState<WeeklyHours | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/dashboard/staff');
    const data = await res.json();
    if (data.success) setStaff(data.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setRole('');
    setPhone('');
    setStatus('ACTIVE');
    setOwnHours(null);
    setError('');
  };

  const openEdit = (s: StaffRow) => {
    setEditingId(s.id);
    setName(s.name);
    setRole(s.role || '');
    setPhone(s.phone || '');
    setStatus(s.status);
    setOwnHours(s.workingHours ? initialHours(s.workingHours) : null);
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingId ? `/api/dashboard/staff/${editingId}` : '/api/dashboard/staff';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, phone, status, ...(editingId ? { workingHours: ownHours } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ');

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
    if (!confirm('حذف هذا الموظف؟')) return;
    await fetch(`/api/dashboard/staff/${id}`, { method: 'DELETE' });
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
          + {t('newStaff')}
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
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('role')}</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('phone')}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="w-full px-3 py-2 border rounded-md text-black text-left" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('status')}</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black">
                <option value="ACTIVE">{t('active')}</option>
                <option value="ON_LEAVE">{t('onLeave')}</option>
              </select>
            </div>
          </div>
          {editingId && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-2">
                <input
                  type="checkbox"
                  checked={ownHours !== null}
                  onChange={(e) => setOwnHours(e.target.checked ? initialHours(null) : null)}
                />
                {settings('staffOwnHours')}
              </label>
              {ownHours ? (
                <WeeklyHoursEditor value={ownHours} onChange={setOwnHours} />
              ) : (
                <p className="text-xs text-stone-500">{settings('followsSalonHours')}</p>
              )}
            </div>
          )}
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
        ) : staff.length === 0 ? (
          <p className="p-6 text-center text-stone-400 text-sm">لا يوجد موظفون بعد</p>
        ) : (
          <table className="w-full text-right text-sm text-stone-600">
            <thead className="bg-stone-50 text-stone-700 uppercase text-xs">
              <tr>
                <th className="p-3">{t('name')}</th>
                <th className="p-3">{t('role')}</th>
                <th className="p-3">{t('phone')}</th>
                <th className="p-3">{t('status')}</th>
                <th className="p-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-stone-100">
                  <td className="p-3 font-medium text-stone-900">{s.name}</td>
                  <td className="p-3">{s.role || '—'}</td>
                  <td className="p-3" dir="ltr">{s.phone || '—'}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {s.status === 'ACTIVE' ? t('active') : t('onLeave')}
                    </span>
                  </td>
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

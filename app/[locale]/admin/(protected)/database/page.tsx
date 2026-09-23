'use client';

import { useCallback, useEffect, useState, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ListToolbar from '@/components/admin/ListToolbar';

type ModelKey = 'services' | 'staff' | 'offers' | 'photos' | 'packages';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export default function AdminDatabasePage() {
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';
  const ar = locale !== 'en';
  const L = (a: string, e: string) => (ar ? a : e);

  const [model, setModel] = useState<ModelKey>('services');
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const tabs: { key: ModelKey; label: string }[] = [
    { key: 'services', label: L('الخدمات', 'Services') },
    { key: 'staff', label: L('الموظفون', 'Staff') },
    { key: 'offers', label: L('العروض', 'Offers') },
    { key: 'photos', label: L('صور المعرض', 'Gallery photos') },
    { key: 'packages', label: L('باقات العملاء', 'Customer packages') },
  ];

  const columns: Record<ModelKey, { key: string; label: string }[]> = {
    services: [
      { key: 'tenant', label: L('الصالون', 'Salon') },
      { key: 'name', label: L('الاسم', 'Name') },
      { key: 'basePrice', label: L('السعر', 'Price') },
      { key: 'baseDurationMinutes', label: L('المدة (د)', 'Duration (min)') },
      { key: 'pricingModel', label: L('نموذج التسعير', 'Pricing model') },
      { key: 'createdAt', label: L('تاريخ الإنشاء', 'Created') },
    ],
    staff: [
      { key: 'tenant', label: L('الصالون', 'Salon') },
      { key: 'name', label: L('الاسم', 'Name') },
      { key: 'role', label: L('الدور', 'Role') },
      { key: 'phone', label: L('الهاتف', 'Phone') },
      { key: 'status', label: L('الحالة', 'Status') },
      { key: 'createdAt', label: L('تاريخ الإنشاء', 'Created') },
    ],
    offers: [
      { key: 'tenant', label: L('الصالون', 'Salon') },
      { key: 'type', label: L('النوع', 'Type') },
      { key: 'discountPercent', label: L('نسبة الخصم', 'Discount %') },
      { key: 'discountAmount', label: L('قيمة الخصم', 'Discount amount') },
      { key: 'isActive', label: L('فعّال', 'Active') },
      { key: 'endsAt', label: L('ينتهي في', 'Ends at') },
    ],
    photos: [
      { key: 'tenant', label: L('الصالون', 'Salon') },
      { key: 'url', label: L('الرابط', 'URL') },
      { key: 'sortOrder', label: L('الترتيب', 'Order') },
      { key: 'createdAt', label: L('تاريخ الإنشاء', 'Created') },
    ],
    packages: [
      { key: 'tenant', label: L('الصالون', 'Salon') },
      { key: 'customer', label: L('العميل', 'Customer') },
      { key: 'packageName', label: L('اسم الباقة', 'Package') },
      { key: 'price', label: L('السعر', 'Price') },
      { key: 'status', label: L('الحالة', 'Status') },
      { key: 'remainingSessions', label: L('الجلسات المتبقية', 'Sessions left') },
      { key: 'expiresAt', label: L('تنتهي في', 'Expires') },
    ],
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/database?model=${model}&q=${encodeURIComponent(q)}&page=${page}`);
    const d = await res.json();
    if (d.success) {
      setRows(d.data);
      setTotal(d.total);
      setPageSize(d.pageSize);
    }
    setLoading(false);
  }, [model, q, page]);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  const fmt = (key: string, v: unknown) => {
    if (v === null || v === undefined || v === '') return '—';
    if (key === 'createdAt' || key === 'endsAt' || key === 'expiresAt') {
      const d = new Date(v as string);
      return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(ar ? 'ar-SA' : 'en-US');
    }
    if (typeof v === 'boolean') return v ? '✓' : '—';
    return String(v);
  };

  const toDateInput = (v: unknown) => {
    if (!v) return '';
    const d = new Date(v as string);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  };

  const startEdit = (row: Row) => {
    setError('');
    setEditing({ ...row });
  };

  const remove = async (row: Row) => {
    if (!confirm(L('حذف نهائي لا يمكن التراجع عنه. متابعة؟', 'Permanent delete, cannot be undone. Continue?'))) return;
    const res = await fetch(`/api/admin/database/${row.id}?model=${model}`, { method: 'DELETE' });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || 'Failed');
    load();
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');

    let body: Record<string, unknown> = {};
    if (model === 'services') {
      body = { nameAr: editing.nameAr, nameEn: editing.nameEn, basePrice: editing.basePrice, baseDurationMinutes: editing.baseDurationMinutes };
    } else if (model === 'staff') {
      body = { name: editing.name, role: editing.role, phone: editing.phone, status: editing.status };
    } else if (model === 'offers') {
      body = { isActive: editing.isActive };
    } else if (model === 'photos') {
      body = { sortOrder: editing.sortOrder };
    } else if (model === 'packages') {
      body = {
        packageNameAr: editing.packageNameAr,
        packageNameEn: editing.packageNameEn,
        price: editing.price,
        status: editing.status,
        remainingSessions: editing.remainingSessions,
        totalSessions: editing.totalSessions,
        expiresAt: editing.expiresAt,
      };
    }

    const res = await fetch(`/api/admin/database/${editing.id}?model=${model}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(d.error || 'Failed');
    setEditing(null);
    load();
  };

  const input = "px-3 py-2 border rounded-md text-black w-full";

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{L('قاعدة البيانات', 'Database')}</h1>
      <p className="text-sm text-slate-500 mb-6">
        {L('عرض وتعديل كامل لكل بيانات المنصة. الجداول الأخرى (الصالونات، الملاك، العملاء، الحجوزات، التقييمات) لها صفحات إدارة مخصصة.', 'Full view and edit access to all platform data. Other tables (salons, owners, customers, bookings, reviews) have their own dedicated management pages.')}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { href: `/${locale}/admin/salons`, label: L('الصالونات', 'Salons') },
          { href: `/${locale}/admin/owners`, label: L('الملاك', 'Owners') },
          { href: `/${locale}/admin/customers`, label: L('العملاء', 'Customers') },
          { href: `/${locale}/admin/bookings`, label: L('الحجوزات', 'Bookings') },
          { href: `/${locale}/admin/reviews`, label: L('التقييمات', 'Reviews') },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="rounded-md border bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
            {l.label} ↗
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setModel(tab.key); setPage(1); setQ(''); setEditing(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              model === tab.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ListToolbar q={q} onQ={(v) => { setQ(v); setPage(1); }} page={page} total={total} pageSize={pageSize} onPage={setPage} />
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      {editing && (
        <form onSubmit={save} className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800 mb-3">{L('تعديل', 'Edit')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {model === 'services' && (
              <>
                <input className={input} placeholder={L('الاسم (عربي)', 'Name (Arabic)')} value={editing.nameAr || ''} onChange={(e) => setEditing({ ...editing, nameAr: e.target.value })} />
                <input className={input} placeholder={L('الاسم (إنجليزي)', 'Name (English)')} dir="ltr" value={editing.nameEn || ''} onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })} />
                <input type="number" className={input} placeholder={L('السعر', 'Price')} value={editing.basePrice ?? ''} onChange={(e) => setEditing({ ...editing, basePrice: e.target.value })} />
                <input type="number" className={input} placeholder={L('المدة (دقائق)', 'Duration (min)')} value={editing.baseDurationMinutes ?? ''} onChange={(e) => setEditing({ ...editing, baseDurationMinutes: e.target.value })} />
              </>
            )}
            {model === 'staff' && (
              <>
                <input className={input} placeholder={L('الاسم', 'Name')} value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <input className={input} placeholder={L('الدور', 'Role')} value={editing.role || ''} onChange={(e) => setEditing({ ...editing, role: e.target.value })} />
                <input className={input} placeholder={L('الهاتف', 'Phone')} dir="ltr" value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                <select className={input} value={editing.status || 'ACTIVE'} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  <option value="ACTIVE">{L('نشط', 'Active')}</option>
                  <option value="ON_LEAVE">{L('إجازة', 'On leave')}</option>
                </select>
              </>
            )}
            {model === 'offers' && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={Boolean(editing.isActive)} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
                {L('فعّال', 'Active')}
              </label>
            )}
            {model === 'photos' && (
              <input type="number" className={input} placeholder={L('الترتيب', 'Sort order')} value={editing.sortOrder ?? 0} onChange={(e) => setEditing({ ...editing, sortOrder: e.target.value })} />
            )}
            {model === 'packages' && (
              <>
                <input className={input} placeholder={L('اسم الباقة (عربي)', 'Package name (Arabic)')} value={editing.packageNameAr || ''} onChange={(e) => setEditing({ ...editing, packageNameAr: e.target.value })} />
                <input className={input} placeholder={L('اسم الباقة (إنجليزي)', 'Package name (English)')} dir="ltr" value={editing.packageNameEn || ''} onChange={(e) => setEditing({ ...editing, packageNameEn: e.target.value })} />
                <input type="number" className={input} placeholder={L('السعر', 'Price')} value={editing.price ?? ''} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
                <select className={input} value={editing.status || 'ACTIVE'} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  <option value="ACTIVE">{L('فعّالة', 'Active')}</option>
                  <option value="COMPLETED">{L('مكتملة', 'Completed')}</option>
                  <option value="CANCELLED">{L('ملغاة', 'Cancelled')}</option>
                </select>
                <input type="number" className={input} placeholder={L('الجلسات المتبقية', 'Sessions left')} value={editing.remainingSessions ?? ''} onChange={(e) => setEditing({ ...editing, remainingSessions: e.target.value })} />
                <input type="number" className={input} placeholder={L('إجمالي الجلسات', 'Total sessions')} value={editing.totalSessions ?? ''} onChange={(e) => setEditing({ ...editing, totalSessions: e.target.value })} />
                <input type="date" className={input} value={toDateInput(editing.expiresAt)} onChange={(e) => setEditing({ ...editing, expiresAt: e.target.value })} />
              </>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={saving} className="bg-slate-900 text-white rounded-md px-4 py-2 text-sm disabled:opacity-50">{L('حفظ', 'Save')}</button>
            <button type="button" onClick={() => setEditing(null)} className="bg-white border px-4 py-2 rounded-md text-sm">{L('إلغاء', 'Cancel')}</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-right text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs text-slate-700">
            <tr>
              {columns[model].map((c) => (
                <th key={c.key} className="p-3">{c.label}</th>
              ))}
              <th className="p-3">{L('إجراءات', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr><td colSpan={columns[model].length + 1} className="p-6 text-center text-slate-400">—</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                {columns[model].map((c) => (
                  <td key={c.key} className="p-3 max-w-xs truncate">{fmt(c.key, r[c.key])}</td>
                ))}
                <td className="p-3">
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => startEdit(r)} className="text-blue-600 hover:underline">{L('تعديل', 'Edit')}</button>
                    <button onClick={() => remove(r)} className="text-red-600 hover:underline">{L('حذف', 'Delete')}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
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
    if (v === null || v === undefined) return '—';
    if (key === 'createdAt' || key === 'endsAt' || key === 'expiresAt') {
      const d = new Date(v as string);
      return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(ar ? 'ar-SA' : 'en-US');
    }
    if (typeof v === 'boolean') return v ? '✓' : '—';
    return String(v);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{L('قاعدة البيانات', 'Database')}</h1>
      <p className="text-sm text-slate-500 mb-6">
        {L('عرض كامل لكل بيانات المنصة. الجداول الأخرى (الصالونات، الملاك، العملاء، الحجوزات، التقييمات) لها صفحات إدارة مخصصة.', 'Full view of all platform data. Other tables (salons, owners, customers, bookings, reviews) have their own dedicated management pages.')}
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
            onClick={() => { setModel(tab.key); setPage(1); setQ(''); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              model === tab.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ListToolbar q={q} onQ={(v) => { setQ(v); setPage(1); }} page={page} total={total} pageSize={pageSize} onPage={setPage} />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-right text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs text-slate-700">
            <tr>
              {columns[model].map((c) => (
                <th key={c.key} className="p-3">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr><td colSpan={columns[model].length} className="p-6 text-center text-slate-400">—</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                {columns[model].map((c) => (
                  <td key={c.key} className="p-3 max-w-xs truncate">{fmt(c.key, r[c.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

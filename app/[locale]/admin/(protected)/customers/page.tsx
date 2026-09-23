'use client';

import { useCallback, useEffect, useState, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import ListToolbar from '@/components/admin/ListToolbar';

interface Row {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
  _count: { customers: number; reviews: number };
}

export default function AdminCustomersPage() {
  const params = useParams();
  const ar = params.locale !== 'en';
  const L = (a: string, e: string) => (ar ? a : e);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [msg, setMsg] = useState('');
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/customers?q=${encodeURIComponent(q)}&page=${page}`);
    const d = await res.json();
    if (d.success) {
      setRows(d.data);
      setTotal(d.total);
      setPageSize(d.pageSize);
    }
  }, [q, page]);

  useEffect(() => {
    const id = setTimeout(load, 250); // debounce البحث
    return () => clearTimeout(id);
  }, [load]);

  const post = async (path: string, body?: object) => {
    setMsg('');
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(d.error || 'Failed');
    else if (d.newPassword) setMsg(`${L('كلمة المرور الجديدة', 'New password')}: ${d.newPassword}`);
    load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const res = await fetch(`/api/admin/customers/${deleting.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmEmail }),
    });
    if (!res.ok) setMsg((await res.json()).error || 'Failed');
    else setDeleting(null);
    load();
  };

  const addCustomer = async (e: FormEvent) => {
    e.preventDefault();
    setMsg('');
    const res = await fetch('/api/admin/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, email: newEmail }),
    });
    const d = await res.json();
    if (!res.ok) return setMsg(d.error || 'Failed');
    setTemp({ email: d.data.email, password: d.tempPassword });
    setNewName('');
    setNewEmail('');
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{L('حسابات العملاء', 'Customer accounts')}</h1>

      {temp && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mb-1">{L('كلمة مرور مؤقتة (انسخها الآن، لن تظهر مرة أخرى):', "Temporary password (copy it now, it won't be shown again):")}</p>
          <p className="font-mono text-base select-all" dir="ltr">{temp.email} — {temp.password}</p>
          <button onClick={() => setTemp(null)} className="mt-2 text-xs underline">OK</button>
        </div>
      )}

      <form onSubmit={addCustomer} className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder={L('اسم العميل', 'Customer name')} className="px-3 py-2 border rounded-md text-black" />
        <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required dir="ltr" placeholder={L('البريد الإلكتروني', 'Email')} className="px-3 py-2 border rounded-md text-black text-left" />
        <button className="bg-slate-900 text-white rounded-md px-4 py-2 text-sm">{L('+ إضافة عميل', '+ Add customer')}</button>
      </form>

      <ListToolbar q={q} onQ={(v) => { setQ(v); setPage(1); }} exportType="customers" page={page} total={total} pageSize={pageSize} onPage={setPage} />
      {msg && <div className="mb-4 rounded bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 select-all">{msg}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-right text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs text-slate-700">
            <tr>
              <th className="p-3">{L('الاسم', 'Name')}</th>
              <th className="p-3">{L('البريد', 'Email')}</th>
              <th className="p-3">{L('صالونات / تقييمات', 'Salons / reviews')}</th>
              <th className="p-3">{L('الحالة', 'Status')}</th>
              <th className="p-3">{L('إجراءات', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-400">—</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="p-3 font-medium text-slate-900">{r.name}</td>
                <td className="p-3" dir="ltr">{r.email}</td>
                <td className="p-3">{r._count.customers} / {r._count.reviews}</td>
                <td className="p-3 text-xs">
                  {r.suspendedAt ? <span className="text-red-700">{L('موقوف', 'Suspended')}</span> : r.emailVerifiedAt ? <span className="text-emerald-700">{L('مؤكد', 'Verified')}</span> : <span className="text-amber-700">{L('غير مؤكد', 'Unverified')}</span>}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-3 text-xs">
                    <button onClick={() => post(`/api/admin/customers/${r.id}/suspend`, { suspend: !r.suspendedAt })} className="text-slate-800 hover:underline">
                      {r.suspendedAt ? L('تفعيل', 'Reactivate') : L('إيقاف', 'Suspend')}
                    </button>
                    <button onClick={() => post(`/api/admin/customers/${r.id}/reset-password`)} className="text-blue-600 hover:underline">{L('كلمة مرور جديدة', 'New password')}</button>
                    <button onClick={() => { setDeleting(r); setConfirmEmail(''); }} className="text-red-600 hover:underline">{L('حذف', 'Delete')}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleting && (
        <div className="mt-6 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-900 mb-3">
            {L('حذف نهائي لحساب', 'Permanently delete account')} <b dir="ltr">{deleting.email}</b>. {L('اكتب البريد للتأكيد:', 'Type the email to confirm:')}
          </p>
          <input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} dir="ltr" className="w-full px-3 py-2 border rounded-md text-black mb-3" />
          <div className="flex gap-2">
            <button disabled={confirmEmail.trim().toLowerCase() !== deleting.email} onClick={confirmDelete} className="bg-red-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-40">
              {L('تأكيد الحذف', 'Confirm delete')}
            </button>
            <button onClick={() => setDeleting(null)} className="bg-white border px-4 py-2 rounded-md text-sm">{L('رجوع', 'Back')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

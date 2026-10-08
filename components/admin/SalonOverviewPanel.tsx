'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Overview {
  tenant: { id: string; name: string; plan: string; trialEndsAt: string | null; isPublished: boolean; automationOff: string[]; currency: string | null; subscription: { onTrial: boolean; trialExpired: boolean; trialDaysLeft: number } };
  owner: { id: string; name: string; email: string; emailVerifiedAt: string | null; suspendedAt: string | null } | null;
  staff: Array<{ id: string; name: string; role: string | null; status: string }>;
  services: Array<{ id: string; name: Record<string, string> | null; basePrice: string | null; baseDurationMinutes: number | null }>;
  counts: { customers: number; appointments: number; offers: number };
  completedRevenue: number;
  appointments: Array<{ id: string; status: string | null; startTime: string | null; totalAmount: string | null; service: { name: Record<string, string> | null } | null; customer: { name: string } | null; employee: { name: string } | null }>;
}

export default function SalonOverviewPanel({ salonId }: { salonId: string }) {
  const params = useParams();
  const ar = params.locale !== 'en';
  const L = (a: string, e: string) => (ar ? a : e);
  const [data, setData] = useState<Overview | null>(null);
  const [msg, setMsg] = useState('');
  const [newPw, setNewPw] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/salons/${salonId}/overview`);
    const d = await res.json();
    if (d.success) setData(d.data);
  }, [salonId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (!data) return null;
  const { tenant, owner } = data;
  const svcName = (n: Record<string, string> | null) => (n && (n[ar ? 'ar' : 'en'] || n.ar || n.en)) || '—';
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString(ar ? 'ar-BH' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

  const act = async (path: string, body?: object, okMsg?: string) => {
    setMsg('');
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(d.error || 'Failed');
    if (d.newPassword) setNewPw(d.newPassword);
    if (okMsg) setMsg(okMsg);
    await load();
    return d;
  };

  const impersonate = async () => {
    const res = await fetch('/api/admin/impersonate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerId: owner!.id }) });
    if (res.ok) window.open(`/${ar ? 'ar' : 'en'}/dashboard`, '_blank');
    else setMsg((await res.json()).error || 'Failed');
  };

  const cancelBooking = async (id: string) => {
    await fetch(`/api/admin/bookings/${id}/cancel`, { method: 'POST' });
    load();
  };

  const autos = [
    { key: 'reports', label: L('التقارير الدورية بالبريد', 'Scheduled email reports'), hint: L('جداول التقارير التي ينشئها المالك', 'Report schedules the owner creates') },
    { key: 'reminders', label: L('تذكير المواعيد للعملاء', 'Appointment reminders'), hint: L('رسالة واتساب قبل الموعد بـ24 ساعة تقريبًا', 'WhatsApp message about 24h before the appointment') },
    { key: 'winBack', label: L('رسائل «اشتقنا لك» على واتساب', 'Win-back WhatsApp messages'), hint: L('لعملاء الصالون المنقطعين الذين راسلوه سابقًا', 'To lapsed clients who have messaged the salon before') },
  ];

  const stats = [
    { label: L('العملاء', 'Customers'), v: data.counts.customers },
    { label: L('الحجوزات', 'Bookings'), v: data.counts.appointments },
    { label: L('الإيراد المكتمل', 'Completed revenue'), v: `${data.completedRevenue.toFixed(3)} ${tenant.currency || ''}` },
    { label: L('العروض', 'Offers'), v: data.counts.offers },
  ];

  return (
    <div className="mb-10 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-4 rounded-2xl border border-slate-200">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-xl font-extrabold text-slate-900">{s.v}</p>
          </div>
        ))}
      </div>

      {msg && <div className="p-3 rounded bg-slate-100 text-sm text-slate-800">{msg}</div>}
      {newPw && (
        <div className="p-3 rounded border border-amber-300 bg-amber-50 text-sm text-amber-900">
          {L('كلمة المرور الجديدة (انسخها الآن):', 'New password (copy now):')} <span className="font-mono select-all" dir="ltr">{newPw}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-1">{L('المهام التلقائية لهذا الصالون', 'Automatic jobs for this salon')}</h2>
        <p className="text-xs text-slate-500 mb-3">{L('تعمل يوميًا الساعة 7 صباحًا (البحرين). الإيقاف هنا يخص هذا الصالون فقط؛ مفاتيح المنصة العامة في إعدادات المنصة.', 'Run daily at 7 AM (Bahrain). Turning one off here affects this salon only; platform-wide switches are in Platform settings.')}</p>
        <ul className="divide-y divide-slate-100">
          {autos.map((a) => {
            const on = !tenant.automationOff.includes(a.key);
            return (
              <li key={a.key} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{a.label}</p>
                  <p className="text-xs text-slate-400">{a.hint}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={on}
                  onClick={() => act(`/api/admin/salons/${salonId}/automations`, { key: a.key, enabled: !on })}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${on ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                >
                  {on ? L('مفعّل', 'On') : L('متوقف', 'Off')}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-3">{L('المالك والاشتراك', 'Owner & subscription')}</h2>
        {owner ? (
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              {owner.name} — <span dir="ltr">{owner.email}</span>{' '}
              <span className={owner.emailVerifiedAt ? 'text-emerald-700' : 'text-amber-700'}>
                {owner.emailVerifiedAt ? L('البريد مؤكد', 'email verified') : L('البريد غير مؤكد', 'email not verified')}
              </span>{' '}
              {owner.suspendedAt && <span className="text-red-700 font-semibold">{L('— موقوف', '— suspended')}</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => act(`/api/admin/owners/${owner.id}/suspend`, { suspend: !owner.suspendedAt }, L('تم', 'Done'))} className={`px-3 py-1.5 rounded-md text-xs ${owner.suspendedAt ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                {owner.suspendedAt ? L('إعادة تفعيل المالك', 'Reactivate owner') : L('إيقاف المالك', 'Suspend owner')}
              </button>
              <button onClick={() => act(`/api/admin/owners/${owner.id}/reset-password`)} className="px-3 py-1.5 rounded-md text-xs bg-slate-800 text-white">
                {L('توليد كلمة مرور جديدة', 'Generate new password')}
              </button>
              {!owner.emailVerifiedAt && (
                <button onClick={() => act(`/api/admin/owners/${owner.id}/resend-verification`, undefined, L('أُرسل رابط التأكيد', 'Verification link sent'))} className="px-3 py-1.5 rounded-md text-xs bg-slate-200 text-slate-800">
                  {L('إعادة إرسال رابط التأكيد', 'Resend verification')}
                </button>
              )}
              <button onClick={impersonate} disabled={Boolean(owner.suspendedAt)} className="px-3 py-1.5 rounded-md text-xs bg-gold-600 text-white disabled:opacity-40">
                {L('الدخول بدل المالك', 'Log in as owner')}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {L('الباقة', 'Plan')}: <b>{tenant.plan}</b>
              {tenant.plan === 'TRIAL' && ` — ${tenant.subscription.trialExpired ? L('التجربة منتهية', 'trial expired') : L(`متبقي ${tenant.subscription.trialDaysLeft} يوم`, `${tenant.subscription.trialDaysLeft} day(s) left`)}`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">—</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900 mb-3">{L('الموظفون', 'Staff')} ({data.staff.length})</h2>
          {data.staff.length === 0 ? <p className="text-sm text-slate-400">—</p> : (
            <ul className="text-sm text-slate-700 space-y-1">
              {data.staff.map((s) => (
                <li key={s.id}>{s.name}{s.role ? ` · ${s.role}` : ''} <span className="text-xs text-slate-400">{s.status}</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900 mb-3">{L('الخدمات', 'Services')} ({data.services.length})</h2>
          {data.services.length === 0 ? <p className="text-sm text-slate-400">—</p> : (
            <ul className="text-sm text-slate-700 space-y-1">
              {data.services.map((s) => (
                <li key={s.id}>{svcName(s.name)} <span className="text-xs text-slate-400">{s.basePrice ? Number(s.basePrice).toFixed(3) : ''} · {s.baseDurationMinutes ?? '—'}m</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
        <h2 className="font-bold text-slate-900 mb-3">{L('آخر الحجوزات', 'Recent bookings')}</h2>
        {data.appointments.length === 0 ? <p className="text-sm text-slate-400">—</p> : (
          <table className="w-full text-right text-sm text-slate-600">
            <tbody>
              {data.appointments.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="p-2 whitespace-nowrap">{fmt(a.startTime)}</td>
                  <td className="p-2">{svcName(a.service?.name ?? null)}</td>
                  <td className="p-2">{a.customer?.name || '—'}</td>
                  <td className="p-2">{a.employee?.name || '—'}</td>
                  <td className="p-2 text-xs">{a.status}</td>
                  <td className="p-2">
                    {a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && (
                      <button onClick={() => cancelBooking(a.id)} className="text-xs text-red-600 hover:underline">{L('إلغاء', 'Cancel')}</button>
                    )}
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

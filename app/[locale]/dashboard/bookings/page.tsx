'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

interface BookingRow {
  id: string;
  status: string | null;
  startTime: string | null;
  totalAmount: string | null;
  service: { name: { ar?: string; en?: string } | null } | null;
  customer: { name: string } | null;
  employee: { name: string } | null;
}

interface Option {
  id: string;
  name: string;
}

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  PENDING_DEPOSIT: 'bg-amber-50 text-amber-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export default function BookingsPage() {
  const t = useTranslations('Bookings');
  const dash = useTranslations('Dashboard');
  const common = useTranslations('Common');
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [services, setServices] = useState<Array<{ id: string; name: { ar?: string; en?: string } | null }>>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [staff, setStaff] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [serviceId, setServiceId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const [bookingsRes, servicesRes, clientsRes, staffRes] = await Promise.all([
      fetch('/api/dashboard/bookings'),
      fetch('/api/dashboard/services'),
      fetch('/api/dashboard/clients'),
      fetch('/api/dashboard/staff'),
    ]);
    const [bookingsData, servicesData, clientsData, staffData] = await Promise.all([
      bookingsRes.json(),
      servicesRes.json(),
      clientsRes.json(),
      staffRes.json(),
    ]);
    if (bookingsData.success) setBookings(bookingsData.data);
    if (servicesData.success) setServices(servicesData.data);
    if (clientsData.success) setCustomers(clientsData.data.map((c: any) => ({ id: c.id, name: c.name })));
    if (staffData.success) setStaff(staffData.data.map((s: any) => ({ id: s.id, name: s.name })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const serviceName = (svc: { name: { ar?: string; en?: string } | null } | null) => {
    if (!svc?.name) return '—';
    return (locale === 'ar' ? svc.name.ar : svc.name.en) || svc.name.ar || svc.name.en || '—';
  };

  const statusLabel = (status: string | null) => {
    switch (status) {
      case 'CONFIRMED':
        return dash('confirmed');
      case 'COMPLETED':
        return dash('completed');
      case 'CANCELLED':
        return dash('cancelled');
      default:
        return dash('pending');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/dashboard/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          customerId: customerId || undefined,
          employeeId: employeeId || undefined,
          startTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (locale === 'en' ? 'Save failed' : 'فشل الحفظ'));

      setShowForm(false);
      setServiceId('');
      setCustomerId('');
      setEmployeeId('');
      setStartTime('');
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/dashboard/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-stone-900">{t('title')}</h1>
        <button
          onClick={() => { setShowForm(true); setError(''); }}
          className="bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-700 transition"
        >
          + {t('newBooking')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-6 space-y-4">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('service')}</label>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required className="w-full px-3 py-2 border rounded-md text-black">
                <option value="">—</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{serviceName(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('clientName')}</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black">
                <option value="">{locale === 'ar' ? 'بدون (ضيف)' : 'None (guest)'}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{dash('assignedStaff')}</label>
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black">
                <option value="">—</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('time')}</label>
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="w-full px-3 py-2 border rounded-md text-black" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-brand-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
              {saving ? '...' : common('save')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-stone-100 text-stone-700 px-4 py-2 rounded-md text-sm">
              {common('cancel')}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-x-auto">
        {loading ? (
          <p className="p-6 text-center text-stone-400 text-sm">...</p>
        ) : bookings.length === 0 ? (
          <p className="p-6 text-center text-stone-400 text-sm">{dash('noBookingsYet')}</p>
        ) : (
          <table className="w-full text-right text-sm text-stone-600">
            <thead className="bg-stone-50 text-stone-700 uppercase text-xs">
              <tr>
                <th className="p-3">{t('clientName')}</th>
                <th className="p-3">{t('service')}</th>
                <th className="p-3">{t('time')}</th>
                <th className="p-3">{t('status')}</th>
                <th className="p-3">{common('edit')}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-stone-100">
                  <td className="p-3 font-medium text-stone-900">{b.customer?.name || '—'}</td>
                  <td className="p-3">{serviceName(b.service)}</td>
                  <td className="p-3">
                    {b.startTime ? new Date(b.startTime).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US') : '—'}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${STATUS_STYLES[b.status || ''] || 'bg-stone-100 text-stone-600'}`}>
                      {statusLabel(b.status)}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      value={b.status || 'PENDING_DEPOSIT'}
                      onChange={(e) => handleStatusChange(b.id, e.target.value)}
                      className="border rounded-md text-xs p-1 text-black"
                    >
                      <option value="PENDING_DEPOSIT">{dash('pending')}</option>
                      <option value="CONFIRMED">{dash('confirmed')}</option>
                      <option value="COMPLETED">{dash('completed')}</option>
                      <option value="CANCELLED">{dash('cancelled')}</option>
                    </select>
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

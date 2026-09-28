'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

const TYPES = ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SERVICE', 'BUY_X_GET_Y', 'FIRST_BOOKING', 'SEASONAL'];

interface ServiceOpt {
  id: string;
  name: { ar?: string; en?: string } | null;
}

interface OfferRow {
  id: string;
  type: string;
  discountPercent: number | null;
  discountAmount: string | null;
  isActive: boolean;
  endsAt: string | null;
  appliesToService: ServiceOpt | null;
  freeService: ServiceOpt | null;
}

export default function OffersPage() {
  const t = useTranslations('Offers');
  const common = useTranslations('Common');
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';

  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [type, setType] = useState('PERCENTAGE');
  const [discountPercent, setDiscountPercent] = useState('10');
  const [discountAmount, setDiscountAmount] = useState('');
  const [appliesToServiceId, setAppliesToServiceId] = useState('');
  const [freeServiceId, setFreeServiceId] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const load = async () => {
    setLoading(true);
    const [offersRes, servicesRes] = await Promise.all([
      fetch('/api/dashboard/offers'),
      fetch('/api/dashboard/services'),
    ]);
    const offersData = await offersRes.json();
    const servicesData = await servicesRes.json();
    if (offersData.success) setOffers(offersData.data);
    if (servicesData.success) setServices(servicesData.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setType('PERCENTAGE');
    setDiscountPercent('10');
    setDiscountAmount('');
    setAppliesToServiceId('');
    setFreeServiceId('');
    setEndsAt('');
    setError('');
  };

  const serviceName = (svc: ServiceOpt | null) => {
    if (!svc?.name) return '—';
    return (locale === 'ar' ? svc.name.ar : svc.name.en) || svc.name.ar || svc.name.en || '—';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/dashboard/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          discountPercent: ['PERCENTAGE', 'FIRST_BOOKING', 'SEASONAL'].includes(type) ? discountPercent : undefined,
          discountAmount: type === 'FIXED_AMOUNT' ? discountAmount : undefined,
          appliesToServiceId: appliesToServiceId || undefined,
          freeServiceId: type === 'FREE_SERVICE' || type === 'BUY_X_GET_Y' ? freeServiceId : undefined,
          endsAt: endsAt || undefined,
        }),
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

  const toggleActive = async (offer: OfferRow) => {
    await fetch(`/api/dashboard/offers/${offer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !offer.isActive }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا العرض؟')) return;
    await fetch(`/api/dashboard/offers/${id}`, { method: 'DELETE' });
    load();
  };

  const offerSummary = (o: OfferRow) => {
    switch (o.type) {
      case 'PERCENTAGE':
        return t('offerSummary_PERCENTAGE', { value: o.discountPercent ?? 0 });
      case 'FIXED_AMOUNT':
        return t('offerSummary_FIXED_AMOUNT', { value: o.discountAmount ?? '', currency: '' });
      case 'FREE_SERVICE':
        return t('offerSummary_FREE_SERVICE', { service: serviceName(o.freeService) });
      case 'BUY_X_GET_Y':
        return t('offerSummary_BUY_X_GET_Y', { service: serviceName(o.freeService) });
      case 'FIRST_BOOKING':
        return t('offerSummary_FIRST_BOOKING');
      default:
        return t('offerSummary_SEASONAL');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-stone-900">{t('title')}</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-700 transition"
        >
          + {t('newOffer')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-6 space-y-4">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('type')}</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black">
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>{t(`type_${ty}` as any)}</option>
              ))}
            </select>
          </div>

          {['PERCENTAGE', 'FIRST_BOOKING', 'SEASONAL'].includes(type) && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('discountPercent')}</label>
              <input type="number" min={1} max={100} value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} required className="w-full px-3 py-2 border rounded-md text-black" />
            </div>
          )}

          {type === 'FIXED_AMOUNT' && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('discountAmount')}</label>
              <input type="number" min={1} step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} required className="w-full px-3 py-2 border rounded-md text-black" />
            </div>
          )}

          {(type === 'FREE_SERVICE' || type === 'BUY_X_GET_Y') && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('freeService')}</label>
              <select value={freeServiceId} onChange={(e) => setFreeServiceId(e.target.value)} required className="w-full px-3 py-2 border rounded-md text-black">
                <option value="">—</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{serviceName(s)}</option>
                ))}
              </select>
            </div>
          )}

          {(type === 'PERCENTAGE' || type === 'FIXED_AMOUNT' || type === 'SEASONAL') && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('appliesToService')}</label>
              <select value={appliesToServiceId} onChange={(e) => setAppliesToServiceId(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black">
                <option value="">{t('allServices')}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{serviceName(s)}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('endsAt')}</label>
            <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" placeholder={t('noEndDate')} />
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
        ) : offers.length === 0 ? (
          <p className="p-6 text-center text-stone-400 text-sm">{t('noOffers')}</p>
        ) : (
          <table className="w-full text-right text-sm text-stone-600">
            <thead className="bg-stone-50 text-stone-700 uppercase text-xs">
              <tr>
                <th className="p-3">{t('type')}</th>
                <th className="p-3">{locale === 'ar' ? 'التفاصيل' : 'Details'}</th>
                <th className="p-3">{t('appliesToService')}</th>
                <th className="p-3">{t('endsAt')}</th>
                <th className="p-3">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="p-3">{common('delete')}</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id} className="border-b border-stone-100">
                  <td className="p-3 font-medium text-stone-900">{t(`type_${o.type}` as any)}</td>
                  <td className="p-3">{offerSummary(o)}</td>
                  <td className="p-3">{o.appliesToService ? serviceName(o.appliesToService) : t('allServices')}</td>
                  <td className="p-3">{o.endsAt ? new Date(o.endsAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US') : t('noEndDate')}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleActive(o)}
                      className={`text-xs px-2 py-1 rounded-md font-medium ${o.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}
                    >
                      {o.isActive ? t('active') : t('inactive')}
                    </button>
                  </td>
                  <td className="p-3">
                    <button onClick={() => handleDelete(o.id)} className="text-red-500 hover:underline">{common('delete')}</button>
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

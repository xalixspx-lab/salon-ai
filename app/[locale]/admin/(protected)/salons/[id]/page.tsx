'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import SalonOverviewPanel from '@/components/admin/SalonOverviewPanel';

export default function AdminEditSalonPage() {
  const t = useTranslations('Admin');
  const settingsT = useTranslations('Settings');
  const common = useTranslations('Common');
  const params = useParams();
  const router = useRouter();
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';
  const id = typeof params.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [addressText, setAddressText] = useState('');
  const [workingHoursText, setWorkingHoursText] = useState('');
  const [currency, setCurrency] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [phone, setPhone] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [depositPercentage, setDepositPercentage] = useState('30');
  const [minBookingNoticeHours, setMinBookingNoticeHours] = useState('2');

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/salons/${id}`);
      const data = await res.json();
      if (data.success) {
        const tenant = data.data;
        setName(tenant.name || '');
        setCity(tenant.city || '');
        setAddressText(tenant.addressText || '');
        setWorkingHoursText(tenant.workingHoursText || '');
        setCurrency(tenant.currency || '');
        setDescriptionAr(tenant.description?.ar || '');
        setDescriptionEn(tenant.description?.en || '');
        setPhone(tenant.phone || '');
        setIsPublished(tenant.isPublished !== false && !tenant.adminHiddenAt);
        setDepositPercentage(String(tenant.depositPercentage ?? 30));
        setMinBookingNoticeHours(String(tenant.minBookingNoticeHours ?? 2));
        setOwnerEmail(tenant.owner?.email || null);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch(`/api/admin/salons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          city,
          addressText,
          workingHoursText,
          currency,
          descriptionAr,
          descriptionEn,
          phone,
          isPublished,
          depositPercentage,
          minBookingNoticeHours,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
      setSaved(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-center text-slate-400 text-sm py-10">...</p>;
  }

  return (
    <div>
      <button onClick={() => router.push(`/${locale}/admin/salons`)} className="text-sm text-slate-500 hover:underline mb-4">
        ← {t('back')}
      </button>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('editSalon')}</h1>
      {ownerEmail && <p className="text-sm text-slate-500 mb-6" dir="ltr">{t('ownerEmail')}: {ownerEmail}</p>}

      <SalonOverviewPanel salonId={id} />

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl space-y-4">
        {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        {saved && <div className="p-3 bg-emerald-50 text-emerald-700 rounded text-sm">تم الحفظ بنجاح</div>}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{settingsT('salonName')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border rounded-md text-black" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{settingsT('city')}</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">العنوان التفصيلي</label>
            <input value={addressText} onChange={(e) => setAddressText(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{settingsT('workingHours')}</label>
          <input value={workingHoursText} onChange={(e) => setWorkingHoursText(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{settingsT('descriptionAr')}</label>
          <textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-md text-black" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{settingsT('descriptionEn')}</label>
          <textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} rows={2} dir="ltr" className="w-full px-3 py-2 border rounded-md text-black text-left" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{settingsT('phone')}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="w-full px-3 py-2 border rounded-md text-black text-left" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">العملة</label>
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} dir="ltr" className="w-full px-3 py-2 border rounded-md text-black text-left" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{settingsT('depositPercentage')}</label>
            <input type="number" min={0} max={100} value={depositPercentage} onChange={(e) => setDepositPercentage(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{settingsT('minBookingNoticeHours')}</label>
            <input type="number" min={0} value={minBookingNoticeHours} onChange={(e) => setMinBookingNoticeHours(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" />
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
          <input type="checkbox" id="isPublished" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="mt-1" />
          <label htmlFor="isPublished" className="text-sm">
            <span className="font-medium text-slate-800">{settingsT('isPublished')}</span>
            <p className="text-slate-500 text-xs mt-0.5">{settingsT('isPublishedWarning')}</p>
          </label>
        </div>

        <button type="submit" disabled={saving} className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
          {saving ? '...' : common('save')}
        </button>
      </form>
    </div>
  );
}

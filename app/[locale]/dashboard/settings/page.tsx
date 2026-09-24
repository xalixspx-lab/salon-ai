'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import LogoUploader from '@/components/dashboard/LogoUploader';
import GalleryManager from '@/components/dashboard/GalleryManager';
import WeeklyHoursEditor, { initialHours } from '@/components/dashboard/WeeklyHoursEditor';
import ChangePasswordCard from '@/components/dashboard/ChangePasswordCard';
import type { WeeklyHours } from '@/lib/schedule';

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const common = useTranslations('Common');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [workingHoursText, setWorkingHoursText] = useState('');
  const [workingHours, setWorkingHours] = useState<WeeklyHours>(initialHours(null));
  const [currency, setCurrency] = useState('');
  const [timezone, setTimezone] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [depositPercentage, setDepositPercentage] = useState('30');
  const [minBookingNoticeHours, setMinBookingNoticeHours] = useState('2');
  const [cancellationHours, setCancellationHours] = useState('24');
  const [refundPercentAfterDeadline, setRefundPercentAfterDeadline] = useState('0');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/dashboard/settings');
      const data = await res.json();
      if (data.success) {
        const tenant = data.data;
        setName(tenant.name || '');
        setCity(tenant.city || '');
        setWorkingHoursText(tenant.workingHoursText || '');
        setWorkingHours(initialHours(tenant.workingHours));
        setCurrency(tenant.currency || '');
        setTimezone(tenant.timezone || '');
        setDescriptionAr(tenant.description?.ar || '');
        setDescriptionEn(tenant.description?.en || '');
        setPhone(tenant.phone || '');
        setLogoUrl(tenant.logoUrl || null);
        setIsPublished(tenant.isPublished !== false);
        setDepositPercentage(String(tenant.depositPercentage ?? 30));
        setMinBookingNoticeHours(String(tenant.minBookingNoticeHours ?? 2));
        setCancellationHours(String(tenant.cancellationHours ?? 24));
        setRefundPercentAfterDeadline(String(tenant.refundPercentAfterDeadline ?? 0));
      }
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          city,
          workingHoursText,
          workingHours,
          currency,
          timezone,
          descriptionAr,
          descriptionEn,
          phone,
          isPublished,
          depositPercentage,
          minBookingNoticeHours,
          cancellationHours,
          refundPercentAfterDeadline,
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
    return <p className="text-center text-stone-400 text-sm py-10">...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">{t('title')}</h1>

      <div className="mb-6">
        <ChangePasswordCard />
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 max-w-2xl space-y-4">
        {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        {saved && <div className="p-3 bg-emerald-50 text-emerald-700 rounded text-sm">تم الحفظ بنجاح</div>}

        {!loading && <LogoUploader key={logoUrl ?? 'none'} initialUrl={logoUrl} />}

        {!loading && <GalleryManager />}

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('salonName')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border rounded-md text-black" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('city')}</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('workingHours')}</label>
          <input
            value={workingHoursText}
            onChange={(e) => setWorkingHoursText(e.target.value)}
            placeholder="مثال: 01:00 م - 11:00 م"
            className="w-full px-3 py-2 border rounded-md text-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">{t('weeklyHours')}</label>
          <p className="text-xs text-stone-500 mb-2">{t('weeklyHoursHint')}</p>
          <WeeklyHoursEditor value={workingHours} onChange={setWorkingHours} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">العملة</label>
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} dir="ltr" className="w-full px-3 py-2 border rounded-md text-black text-left" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">المنطقة الزمنية</label>
            <input value={timezone} onChange={(e) => setTimezone(e.target.value)} dir="ltr" className="w-full px-3 py-2 border rounded-md text-black text-left" />
          </div>
        </div>

        <hr className="border-stone-100" />

        <h2 className="text-sm font-bold text-stone-800">{t('customerPageSection')}</h2>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('descriptionAr')}</label>
          <textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-md text-black" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('descriptionEn')}</label>
          <textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} rows={3} dir="ltr" className="w-full px-3 py-2 border rounded-md text-black text-left" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('phone')}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="w-full px-3 py-2 border rounded-md text-black text-left" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('depositPercentage')}</label>
            <input type="number" min={0} max={100} value={depositPercentage} onChange={(e) => setDepositPercentage(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('minBookingNoticeHours')}</label>
            <input type="number" min={0} value={minBookingNoticeHours} onChange={(e) => setMinBookingNoticeHours(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('cancellationHours')}</label>
          <input type="number" min={0} value={cancellationHours} onChange={(e) => setCancellationHours(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('refundPercentAfterDeadline')}</label>
          <input type="number" min={0} max={100} value={refundPercentAfterDeadline} onChange={(e) => setRefundPercentAfterDeadline(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" />
          <p className="text-xs text-stone-500 mt-1">{t('refundPercentHint')}</p>
        </div>

        <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-md border border-stone-200">
          <input
            type="checkbox"
            id="isPublished"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="mt-1"
          />
          <label htmlFor="isPublished" className="text-sm">
            <span className="font-medium text-stone-800">{t('isPublished')}</span>
            <p className="text-stone-500 text-xs mt-0.5">{t('isPublishedWarning')}</p>
          </label>
        </div>

        <button type="submit" disabled={saving} className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
          {saving ? '...' : t('saveChanges')}
        </button>
      </form>
    </div>
  );
}

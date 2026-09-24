'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { describeOffer } from '@/lib/offers';
import type { ApplicableOffer } from './ServicesList';

interface ServiceOption {
  id: string;
  displayName: string;
  basePrice: number | null;
}

interface StaffOption {
  id: string;
  name: string;
}

interface CustomerSessionInfo {
  loggedIn: boolean;
  name?: string;
  email?: string;
}

export default function BookingForm({
  tenantId,
  service,
  currency,
  depositPercentage,
  cancellationHours,
  refundPercentAfterDeadline,
  offers,
  onClose,
}: {
  tenantId: string;
  service: ServiceOption;
  currency: string;
  depositPercentage: number;
  cancellationHours: number;
  refundPercentAfterDeadline: number;
  offers: ApplicableOffer[];
  onClose: () => void;
}) {
  const t = useTranslations('SalonDetail');
  const accountT = useTranslations('Account');
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [session, setSession] = useState<CustomerSessionInfo>({ loggedIn: false });
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [offerId, setOfferId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Bahrain');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/account/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.loggedIn) setSession({ loggedIn: true, name: data.name, email: data.email });
      })
      .catch(() => {});

    fetch(`/api/salons/${tenantId}/staff`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStaff(data.data);
      })
      .catch(() => {});
  }, [tenantId]);

  useEffect(() => {
    setStartTime('');
    if (!date) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    const qs = new URLSearchParams({ serviceId: service.id, date, ...(employeeId ? { employeeId } : {}) });
    fetch(`/api/salons/${tenantId}/availability?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setSlots(data.success ? data.data.slots : []);
        if (data.success && data.data.timezone) setTimezone(data.data.timezone);
      })
      .catch(() => !cancelled && setSlots([]))
      .finally(() => !cancelled && setLoadingSlots(false));
    return () => {
      cancelled = true;
    };
  }, [tenantId, service.id, date, employeeId]);

  const selectedOffer = useMemo(() => offers.find((o) => o.id === offerId) || null, [offers, offerId]);

  const finalPrice = useMemo(() => {
    if (!service.basePrice) return null;
    if (!selectedOffer) return service.basePrice;
    if (['PERCENTAGE', 'FIRST_BOOKING', 'SEASONAL'].includes(selectedOffer.type) && selectedOffer.discountPercent) {
      return Math.max(0, service.basePrice * (1 - selectedOffer.discountPercent / 100));
    }
    if (selectedOffer.type === 'FIXED_AMOUNT' && selectedOffer.discountAmount) {
      return Math.max(0, service.basePrice - selectedOffer.discountAmount);
    }
    if (selectedOffer.type === 'FREE_SERVICE') {
      return 0;
    }
    return service.basePrice;
  }, [service.basePrice, selectedOffer]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          serviceId: service.id,
          customerName: session.loggedIn ? session.name : name,
          customerPhone: session.loggedIn ? undefined : phone,
          employeeId: employeeId || undefined,
          offerId: offerId || undefined,
          startTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-black max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="text-center py-4">
            <p className="text-emerald-600 text-2xl mb-3">✓</p>
            <p className="text-gray-800 font-medium mb-4">{t('bookingSuccess')}</p>
            <button
              onClick={onClose}
              className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition"
            >
              {t('close')}
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold mb-1">{t('bookingFormTitle')}</h3>
            <p className="text-sm text-gray-500 mb-4">{service.displayName}</p>

            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
              {session.loggedIn ? (
                <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700">
                  {accountT('bookingAs')} <span className="font-medium">{session.name}</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-400">
                    {accountT('signInPrompt')} —{' '}
                    <a href="/account/login" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {accountT('loginLink')}
                    </a>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('yourName')}</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('yourPhone')}</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      dir="ltr"
                      className="w-full px-3 py-2 border rounded-md text-left"
                    />
                  </div>
                </>
              )}

              {staff.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('chooseStaff')}</label>
                  <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full px-3 py-2 border rounded-md">
                    <option value="">{t('anyStaff')}</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {offers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('applyOffer')}</label>
                  <select value={offerId} onChange={(e) => setOfferId(e.target.value)} className="w-full px-3 py-2 border rounded-md">
                    <option value="">{t('noOffer')}</option>
                    {offers.map((o) => (
                      <option key={o.id} value={o.id}>{describeOffer(o as any, 'ar', currency)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('date')}</label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              {date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('availableTimes')}</label>
                  {loadingSlots ? (
                    <p className="text-xs text-gray-400">...</p>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-gray-500 bg-gray-50 rounded-md px-3 py-2">{t('noSlots')}</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStartTime(s)}
                          className={`py-1.5 rounded-md text-sm border transition ${
                            startTime === s ? 'bg-black text-white border-black' : 'bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timezone })}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedOffer && finalPrice !== null && (
                <p className="text-sm font-medium text-emerald-700 bg-emerald-50 rounded-md px-3 py-2">
                  {t('finalPrice')}: {finalPrice.toFixed(0)} {currency}
                </p>
              )}

              <p className="text-xs text-gray-400">
                {depositPercentage > 0
                  ? `${t('depositNote')} (${depositPercentage}%${
                      finalPrice !== null
                        ? ` ≈ ${((finalPrice * depositPercentage) / 100).toFixed(0)} ${currency}`
                        : ''
                    })`
                  : t('noDepositNote')}
              </p>

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1">
                <p className="font-semibold">{isAr ? 'سياسة الإلغاء والاسترداد' : 'Cancellation & refund policy'}</p>
                <p>
                  {isAr
                    ? `إلغاء أو تعديل مجاني حتى ${cancellationHours} ساعة قبل الموعد.`
                    : `Free cancellation or change up to ${cancellationHours} hours before the appointment.`}
                </p>
                {depositPercentage > 0 && (
                  <p>
                    {isAr
                      ? `بعد ذلك يُسترد ${refundPercentAfterDeadline}% من العربون. وإن ألغى الصالون يُسترد كاملًا.`
                      : `After that, ${refundPercentAfterDeadline}% of the deposit is refunded. If the salon cancels, it is refunded in full.`}
                  </p>
                )}
                <p>
                  {isAr ? 'بتأكيد الحجز أنت توافق على ' : 'By confirming you agree to the '}
                  <a href={`/${locale}/legal/refund`} target="_blank" className="underline">{isAr ? 'سياسة الاسترداد' : 'refund policy'}</a>
                  {isAr ? ' و' : ', '}
                  <a href={`/${locale}/legal/terms`} target="_blank" className="underline">{isAr ? 'شروط الاستخدام' : 'terms'}</a>
                  {isAr ? ' و' : ' and '}
                  <a href={`/${locale}/legal/privacy`} target="_blank" className="underline">{isAr ? 'سياسة الخصوصية' : 'privacy policy'}</a>.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !startTime}
                  className="flex-1 bg-black text-white py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {submitting ? t('submitting') : t('confirmBooking')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                >
                  {t('close')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { describeOffer } from '@/lib/offers';
import type { ApplicableOffer } from './ServicesList';

// الدينار البحريني بثلاث خانات عشرية: 4.5 تظهر "4.5" لا "5" (toFixed(0) كان يقرّب)
const formatMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n);

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
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-[fadeIn_.15s_ease-out]">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-md w-full p-6 text-stone-900 max-h-[92vh] overflow-y-auto animate-[popIn_.18s_ease-out]">
        {success ? (
          <div className="text-center py-4">
            <span className="mx-auto mb-4 h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">✓</span>
            <p className="text-gray-800 font-medium mb-4">{t('bookingSuccess')}</p>
            <button
              onClick={onClose}
              className="bg-brand-600 text-white h-11 px-6 rounded-xl text-sm font-semibold hover:bg-brand-700 transition"
            >
              {t('close')}
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-1">{t('bookingFormTitle')}</h3>
            <p className="text-sm text-brand-700 font-medium mb-4">{service.displayName}</p>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
              {session.loggedIn ? (
                <div className="bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-700">
                  {accountT('bookingAs')} <span className="font-medium">{session.name}</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-400">
                    {accountT('signInPrompt')} —{' '}
                    <a href={`/${locale}/account/login`} className="text-brand-600 hover:underline">
                      {accountT('loginLink')}
                    </a>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('yourName')}</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full h-11 px-3.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('yourPhone')}</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      dir="ltr"
                      className="w-full h-11 px-3.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 text-left"
                    />
                  </div>
                </>
              )}

              {staff.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('chooseStaff')}</label>
                  <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full h-11 px-3.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400">
                    <option value="">{t('anyStaff')}</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {offers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('applyOffer')}</label>
                  <select value={offerId} onChange={(e) => setOfferId(e.target.value)} className="w-full h-11 px-3.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400">
                    <option value="">{t('noOffer')}</option>
                    {offers.map((o) => (
                      <option key={o.id} value={o.id}>{describeOffer(o as any, locale === 'en' ? 'en' : 'ar', currency)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('date')}</label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400"
                />
              </div>

              {date && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('availableTimes')}</label>
                  {loadingSlots ? (
                    <p className="text-xs text-gray-400">...</p>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-stone-500 bg-stone-50 rounded-xl px-3.5 py-2.5">{t('noSlots')}</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStartTime(s)}
                          className={`h-10 rounded-xl text-sm font-medium border transition tabular-nums ${
                            startTime === s ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/25' : 'bg-white text-stone-700 border-stone-200 hover:border-brand-300 hover:bg-brand-50'
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
                <p className="text-sm font-medium text-emerald-700 bg-emerald-50 rounded-xl px-3.5 py-2.5">
                  {t('finalPrice')}: {formatMoney(finalPrice)} {currency}
                </p>
              )}

              <p className="text-xs text-stone-500">
                {depositPercentage > 0
                  ? `${t('depositNote')} (${depositPercentage}%${
                      finalPrice !== null
                        ? ` ≈ ${formatMoney((finalPrice * depositPercentage) / 100)} ${currency}`
                        : ''
                    })`
                  : t('noDepositNote')}
              </p>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-900 space-y-1">
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
                  <a href={`/${locale}/legal/refund`} target="_blank" rel="noopener noreferrer" className="underline">{isAr ? 'سياسة الاسترداد' : 'refund policy'}</a>
                  {isAr ? ' و' : ', '}
                  <a href={`/${locale}/legal/terms`} target="_blank" rel="noopener noreferrer" className="underline">{isAr ? 'شروط الاستخدام' : 'terms'}</a>
                  {isAr ? ' و' : ' and '}
                  <a href={`/${locale}/legal/privacy`} target="_blank" rel="noopener noreferrer" className="underline">{isAr ? 'سياسة الخصوصية' : 'privacy policy'}</a>.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !startTime}
                  className="flex-1 bg-brand-600 text-white h-12 rounded-xl text-sm font-semibold shadow-sm shadow-brand-600/20 hover:bg-brand-700 transition disabled:opacity-50"
                >
                  {submitting ? t('submitting') : t('confirmBooking')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 h-12 rounded-xl text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition"
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

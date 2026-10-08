'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import BookingForm from './BookingForm';

interface ServiceRow {
  id: string;
  displayName: string;
  basePrice: number | null;
  baseDurationMinutes: number | null;
}

export interface ApplicableOffer {
  id: string;
  type: string;
  discountPercent: number | null;
  discountAmount: number | null;
  appliesToServiceId: string | null;
  freeServiceId: string | null;
}

export default function ServicesList({
  tenantId,
  services,
  currency,
  depositPercentage,
  cancellationHours,
  refundPercentAfterDeadline,
  offers,
}: {
  tenantId: string;
  services: ServiceRow[];
  currency: string;
  depositPercentage: number;
  cancellationHours: number;
  refundPercentAfterDeadline: number;
  offers: ApplicableOffer[];
}) {
  const t = useTranslations('SalonDetail');
  const [selected, setSelected] = useState<ServiceRow | null>(null);

  if (services.length === 0) {
    return <p className="text-stone-400 text-sm py-4">{t('noServices')}</p>;
  }

  const offersForService = (serviceId: string) =>
    offers.filter((o) =>
      o.type === 'FREE_SERVICE'
        ? o.freeServiceId === serviceId
        : o.appliesToServiceId === serviceId || o.appliesToServiceId === null
    );

  return (
    <div className="space-y-3">
      {services.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-3 p-4 bg-white rounded-xl border border-stone-200/80 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
        >
          <div>
            <h3 className="font-semibold text-stone-900">{s.displayName}</h3>
            <p className="text-sm text-stone-500 mt-0.5">
              {s.basePrice ? `${s.basePrice} ${currency}` : '—'}
              {s.baseDurationMinutes ? ` · ${s.baseDurationMinutes} ${t('durationLabel')}` : ''}
            </p>
          </div>
          <button
            onClick={() => setSelected(s)}
            className="bg-brand-600 text-white h-10 px-4 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors whitespace-nowrap shadow-sm shadow-brand-600/20"
          >
            {t('bookThisService')}
          </button>
        </div>
      ))}

      {selected && (
        <BookingForm
          tenantId={tenantId}
          service={{ id: selected.id, displayName: selected.displayName, basePrice: selected.basePrice }}
          currency={currency}
          depositPercentage={depositPercentage}
          cancellationHours={cancellationHours}
          refundPercentAfterDeadline={refundPercentAfterDeadline}
          offers={offersForService(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

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
    return <p className="text-gray-400 text-sm py-4">{t('noServices')}</p>;
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
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
        >
          <div>
            <h3 className="font-semibold text-gray-900">{s.displayName}</h3>
            <p className="text-sm text-gray-500">
              {s.basePrice ? `${s.basePrice} ${currency}` : '—'}
              {s.baseDurationMinutes ? ` · ${s.baseDurationMinutes} ${t('durationLabel')}` : ''}
            </p>
          </div>
          <button
            onClick={() => setSelected(s)}
            className="bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors whitespace-nowrap"
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

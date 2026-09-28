'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

// رابط الحجز الجاهز للمالك: نفس رابط صفحة الصالون العامة الحقيقي، ليضعه في
// Google Business Profile أو يشاركه — يفتح دائمًا صفحتنا نحن، لا حجزًا خارجيًا.
export default function BookingLinkCard({ tenantId }: { tenantId: string }) {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  const link =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${locale}/salons/${tenantId}`
      : `/${locale}/salons/${tenantId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* لا شيء */
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 sm:p-6 mb-6">
      <h2 className="font-bold text-stone-900 mb-1">{t('bookingLinkTitle')}</h2>
      <p className="text-sm text-stone-500 mb-3 leading-relaxed">{t('bookingLinkDesc')}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          readOnly
          value={link}
          dir="ltr"
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 min-w-0 px-3 py-2 rounded-md border border-stone-200 bg-stone-50 text-sm text-stone-700 truncate"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 bg-stone-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-stone-800 transition"
        >
          {copied ? t('bookingLinkCopied') : t('bookingLinkCopy')}
        </button>
      </div>
    </div>
  );
}

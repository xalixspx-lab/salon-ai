'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { REFERRAL_BONUS_POINTS } from '@/lib/loyaltyConstants';

// بطاقة "ادعُ صديقًا": رابط جاهز بكود العميل + نسخ سريع + مشاركة واتساب
// مباشرة (رابط wa.me عادي، لا يحتاج أي API أو حساب أعمال على واتساب).
export default function InviteFriendsCard({ referralCode }: { referralCode: string }) {
  const t = useTranslations('Account');
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  const link =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${locale}/account/register?ref=${referralCode}`
      : `/${locale}/account/register?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* لا شيء — متصفحات نادرة بلا Clipboard API، الرابط ظاهر نصيًا أصلًا */
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(t('inviteWhatsappText', { link }))}`;

  return (
    <div className="rounded-2xl bg-gradient-to-l from-violet-600 via-fuchsia-600 to-rose-500 p-5 sm:p-6 text-white">
      <h2 className="text-lg font-bold mb-1">🎁 {t('inviteTitle')}</h2>
      <p className="text-sm text-white/90 mb-4">{t('inviteDesc', { points: REFERRAL_BONUS_POINTS })}</p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          readOnly
          value={link}
          dir="ltr"
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/15 text-white text-sm placeholder-white/60 border border-white/20 truncate"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100 transition"
        >
          {copied ? t('inviteLinkCopied') : t('inviteCopyLink')}
        </button>
      </div>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl px-4 py-2 text-sm font-medium transition"
      >
        📱 {t('inviteShareWhatsapp')}
      </a>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';

// خانة موافقة إلزامية بروابط الوثائق (تُفتح في تبويب جديد). kind يحدد الوثائق المعنية.
export default function LegalCheckbox({
  kind,
  checked,
  onChange,
}: {
  kind: 'salon' | 'customer';
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const locale = useLocale();
  const ar = locale === 'ar';
  const link = (slug: string, a: string, e: string) => (
    <Link href={`/${locale}/legal/${slug}`} target="_blank" className="text-blue-600 underline">
      {ar ? a : e}
    </Link>
  );
  return (
    <label className="flex items-start gap-2 text-sm text-gray-700">
      <input type="checkbox" required checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1" />
      <span>
        {ar ? 'أوافق على ' : 'I agree to the '}
        {kind === 'salon' ? (
          <>
            {link('tenant-agreement', 'اتفاقية الصالون', 'Salon Agreement')}
            {ar ? '، ' : ', '}
          </>
        ) : null}
        {link('terms', 'شروط الاستخدام', 'Terms of Use')}
        {ar ? ' و' : ' and '}
        {link('privacy', 'سياسة الخصوصية', 'Privacy Policy')}
      </span>
    </label>
  );
}

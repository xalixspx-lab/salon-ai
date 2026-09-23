'use client';

import { useEffect, useRef } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// يظهر فقط إذا كان المفتاح العام مضبوطًا في البيئة — بدونه لا يُعرض شيء ولا
// يُطلب تحقق (الحقل الفخّي وحده يكفي كحد أدنى). تفعيله يتطلب مفتاح Cloudflare
// Turnstile المجاني (لا يحتاج بطاقة دفع، فقط تسجيل حساب).
export default function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;

    const renderWidget = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const turnstile = (window as any).turnstile;
      if (turnstile && ref.current) {
        turnstile.render(ref.current, { sitekey: SITE_KEY, callback: onVerify });
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).turnstile) {
      renderWidget();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="my-2" />;
}

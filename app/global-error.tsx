'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// يلتقط أخطاء العرض (rendering) التي تحدث في الجذر ولا يمكن لأي error.tsx آخر التقاطها
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body dir="rtl">
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>حدث خطأ غير متوقع</p>
            <p style={{ color: '#666' }}>تم إبلاغ الفريق التقني تلقائيًا. حاول تحديث الصفحة.</p>
          </div>
        </div>
      </body>
    </html>
  );
}

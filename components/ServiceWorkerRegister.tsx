'use client';

import { useEffect } from 'react';

// يسجّل خدمة العمل (public/sw.js) في المتصفح فقط وفي الإنتاج، فلا تتداخل مع وضع
// التطوير (HMR). الفشل صامت: الموقع يعمل كاملًا بدونها، هي فقط للتثبيت وصفحة الاتصال.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}

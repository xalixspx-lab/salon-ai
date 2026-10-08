import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { CUSTOMER_SIDE_ENABLED } from '@/lib/retired';

// تسجيل العملاء متوقف (المنصة لأصحاب الصالونات فقط) — راجع lib/retired.ts
export default function RegisterLayout({ children }: { children: ReactNode }) {
  if (!CUSTOMER_SIDE_ENABLED) notFound();
  return <>{children}</>;
}

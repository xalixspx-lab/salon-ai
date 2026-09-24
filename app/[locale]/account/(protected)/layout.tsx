import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { getCustomerSession } from '@/lib/customerSession';
import { hasCurrentDataConsent } from '@/lib/legal';

export default async function AccountLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getCustomerSession();

  if (!session) {
    redirect(`/${locale}/account/login`);
  }

  if (!(await hasCurrentDataConsent(session.accountId))) {
    redirect(`/${locale}/accept-terms?as=customer`);
  }

  return <>{children}</>;
}

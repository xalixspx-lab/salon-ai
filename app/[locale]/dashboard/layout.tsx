import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getPlatformSettings } from '@/lib/platformSettings';
import ImpersonationBanner from '@/components/dashboard/ImpersonationBanner';
import VerifyEmailBanner from '@/components/VerifyEmailBanner';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { hasAcceptedTenantAgreement } from '@/lib/legal';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { name: true, logoUrl: true },
  });

  if (!tenant) {
    redirect(`/${locale}/login`);
  }

  if (!session.imp && !(await hasAcceptedTenantAgreement(session.tenantId))) {
    redirect(`/${locale}/accept-terms?as=owner`);
  }

  const { announcement } = await getPlatformSettings();
  const announcementText = announcement.active ? (locale === 'ar' ? announcement.textAr : announcement.textEn) || announcement.textAr || announcement.textEn : '';

  return (
    <DashboardShell locale={locale} tenantName={tenant.name} logoUrl={tenant.logoUrl}>
      {announcementText && (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">📢 {announcementText}</div>
      )}
      {session.imp && <ImpersonationBanner adminEmail={session.imp} />}
      <VerifyEmailBanner audience="owner" />
      {children}
    </DashboardShell>
  );
}

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getCustomerSession } from '@/lib/customerSession';
import { hasAcceptedTenantAgreement, hasCurrentDataConsent } from '@/lib/legal';
import AcceptTermsForm from '@/components/AcceptTermsForm';

// بوابة موافقة: تظهر لصاحب صالون أو عميل لم يوافق على النسخة الحالية من الوثائق
// (حسابات أنشأها الأدمن، أو بعد تحديث الوثائق). تقع خارج مجموعات الحماية لتفادي الحلقة.
export default async function AcceptTermsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const { locale } = await params;
  const { as } = await searchParams;
  const audience = as === 'customer' ? 'customer' : 'owner';

  if (audience === 'owner') {
    const session = await getSession();
    if (!session) redirect(`/${locale}/login`);
    if (session.imp || (await hasAcceptedTenantAgreement(session.tenantId))) redirect(`/${locale}/dashboard`);
  } else {
    const session = await getCustomerSession();
    if (!session) redirect(`/${locale}/account/login`);
    if (await hasCurrentDataConsent(session.accountId)) redirect(`/${locale}/account`);
  }

  return <AcceptTermsForm audience={audience} locale={locale} />;
}

import { ForgotPasswordForm } from '@/components/AuthFlowForms';

export default async function ForgotPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ audience?: string }>;
}) {
  const { locale } = await params;
  const { audience } = await searchParams;
  // لا افتراض إلى 'owner' بعد الآن: الدخول الموحّد لا يعرف نوع الحساب مسبقًا،
  // فنترك الخادم يتعرّف عليه من البريد إلا إذا جاء audience صريحًا في الرابط
  // (مثل رابط "لأصحاب الصالونات" القديم أو رابط الأدمن).
  return (
    <ForgotPasswordForm
      locale={locale}
      audience={audience === 'owner' || audience === 'customer' || audience === 'admin' ? audience : undefined}
    />
  );
}

import PublicHeader from '@/components/PublicHeader';
import UnifiedLoginForm from '@/components/UnifiedLoginForm';

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PublicHeader locale={locale} />
      <UnifiedLoginForm />
    </>
  );
}

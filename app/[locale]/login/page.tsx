import PublicHeader from '@/components/PublicHeader';
import OwnerLoginForm from '@/components/OwnerLoginForm';

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PublicHeader locale={locale} />
      <OwnerLoginForm />
    </>
  );
}

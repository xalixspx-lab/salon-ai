import PublicHeader from '@/components/PublicHeader';
import NewSalonForm from '@/components/NewSalonForm';

export default async function NewSalonPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PublicHeader locale={locale} />
      <NewSalonForm />
    </>
  );
}

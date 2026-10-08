import { redirect } from 'next/navigation';

// دخول العملاء متوقف؛ صفحة الدخول الموحّدة لأصحاب الصالونات فقط
export default async function AccountLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/login`);
}

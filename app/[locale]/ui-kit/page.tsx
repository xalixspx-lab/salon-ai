import type { Metadata } from 'next';
import KitShowcase from '@/components/ui/KitShowcase';
import PublicHeader from '@/components/PublicHeader';

export const metadata: Metadata = { title: 'UI kit', robots: { index: false, follow: false } };

// معرض داخلي للمكوّنات (غير مفهرس): يعرض كل مكوّنات الثيم الموحّد للمراجعة البصرية
export default async function UiKitPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PublicHeader locale={locale} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 mb-8">{locale === 'ar' ? 'مكوّنات الثيم' : 'Theme components'}</h1>
        <KitShowcase ar={locale === 'ar'} />
      </main>
    </>
  );
}

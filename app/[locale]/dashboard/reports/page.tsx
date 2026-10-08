import { getTranslations } from 'next-intl/server';
import ReportsWorkspace from '@/components/reports/ReportsWorkspace';
import { ownerTypeOptions } from '@/lib/reports/typeOptions';

export default async function DashboardReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('Dashboard');
  return (
    <div>
      <h1 className="no-print text-2xl font-bold text-stone-900 mb-6">{t('reports')}</h1>
      <ReportsWorkspace apiBase="/api/dashboard" types={ownerTypeOptions(locale === 'en')} accent="brand" />
    </div>
  );
}

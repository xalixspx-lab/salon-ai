import { getTranslations } from 'next-intl/server';
import ReportsWorkspace from '@/components/reports/ReportsWorkspace';
import { adminTypeOptions } from '@/lib/reports/typeOptions';

export default async function AdminReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('Admin');
  return (
    <div>
      <h1 className="no-print text-2xl font-bold text-slate-900 mb-6">{t('reports')}</h1>
      <ReportsWorkspace apiBase="/api/admin" types={adminTypeOptions(locale === 'en')} accent="slate" />
    </div>
  );
}

import { getTranslations } from 'next-intl/server';

// حالة تحميل فورية أثناء التنقل بين الصفحات (خصوصًا مهم في غلاف التطبيق حيث لا
// يوجد مؤشر تحميل للمتصفح) بدل شاشة جامدة حتى يكتمل جلب بيانات الخادم
export default async function Loading() {
  const t = await getTranslations('Errors');
  return (
    <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-brand-600 animate-spin" />
        <span className="text-sm">{t('loading')}</span>
      </div>
    </div>
  );
}

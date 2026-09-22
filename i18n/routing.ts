import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

// ملاحظة: كانت القائمة تضم 8 لغات لكن مجلد messages/ يحتوي فقط ar/en،
// ما كان يسبب خطأ 500 عند زيارة أي لغة أخرى. أعد التوسّع لاحقًا بعد
// إضافة ملفات ترجمة فعلية لكل لغة جديدة.
export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  // المنصة عربية أولًا: لا نعتمد على لغة المتصفح (Accept-Language) لتحديد
  // اللغة الافتراضية — زائر جديد يرى العربية دائمًا، ويبدّل يدويًا إن أراد
  // (عبر مبدّل اللغة)، ويُحترم اختياره بعدها عبر كوكي NEXT_LOCALE كالمعتاد.
  localeDetection: false,
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
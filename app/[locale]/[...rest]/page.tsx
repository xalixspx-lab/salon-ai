import { notFound } from 'next/navigation';

// أي رابط غير معروف تحت /ar أو /en يمر هنا ليُعرض داخل تخطيط اللغة بصفحة
// not-found.tsx المُعرَّبة بدل صفحة 404 الافتراضية الإنجليزية لـ Next
export default function CatchAll() {
  notFound();
}

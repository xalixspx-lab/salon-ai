// قوالب واتساب الصادرة (تذكير الموعد، اشتقنا لك). خارج نافذة الـ24 ساعة لا يسمح Meta إلا بقوالب
// معتمدة مسبقًا؛ أسماؤها ولغتها قابلة للضبط من المتغيرات (انظر docs/WHATSAPP_TEMPLATES.md).
export const TEMPLATES = {
  reminder: () => process.env.WHATSAPP_TPL_REMINDER || 'appointment_reminder',
  winBack: () => process.env.WHATSAPP_TPL_WINBACK || 'we_miss_you',
  lang: () => process.env.WHATSAPP_TPL_LANG || 'ar',
} as const;

export const WIN_BACK_AFTER_DAYS = 45;
// حد يومي لرسائل «اشتقنا لك» لكل صالون (حماية جودة الرقم لدى Meta من الحظر)
export const WIN_BACK_DAILY_CAP = 30;

// متغيرات النص {{1}}.. بالترتيب. تذكير: الاسم، الصالون، الموعد. اشتقنا لك: الاسم، الصالون.
export const reminderParams = (customerName: string, salonName: string, when: string) => [customerName || '—', salonName, when];
export const winBackParams = (customerName: string, salonName: string) => [customerName || '—', salonName];

// نص تقريبي يُحفظ في صندوق المالك ليرى ما أُرسل (النص الفعلي هو القالب المعتمد لدى Meta)
export const reminderPreview = (p: string[]) => `🔔 تذكير بموعدك: ${p[0]}، لديك موعد في ${p[1]} — ${p[2]}`;
export const winBackPreview = (p: string[]) => `💜 اشتقنا لك ${p[0]}! ${p[1]} بانتظارك — يسعدنا حجز موعدك القادم.`;

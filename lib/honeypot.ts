// حقل فخّ للبوتات: مخفي عن المستخدم الحقيقي (CSS + aria-hidden)، والبوتات
// التي تملأ كل الحقول تلقائيًا تقع فيه. لا يتطلب أي حساب أو مفتاح خارجي.
export function isHoneypotFilled(body: Record<string, unknown>): boolean {
  return typeof body.website === 'string' && body.website.trim().length > 0;
}

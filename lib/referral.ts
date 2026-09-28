import { randomInt } from 'crypto';
import { prisma } from '@/lib/prisma';

// نفس أبجدية كلمات المرور المؤقتة (بلا رموز ملتبسة مثل 0/O و1/I) لأن الكود
// يُكتب/يُنسخ يدويًا أحيانًا. أحرف كبيرة فقط لسهولة القراءة والمشاركة.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length = 8): string {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

// كود فريد مضمون: يعيد المحاولة على التصادم النادر جدًا (مساحة 33^8 ممكنة)
export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const existing = await prisma.customerAccount.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new Error('تعذّر توليد كود إحالة فريد');
}

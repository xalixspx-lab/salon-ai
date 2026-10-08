import { prisma } from '@/lib/prisma';
import { normalizeWaPhone } from '@/lib/whatsappCore';

// رقم واتساب الصالون للتواصل العام: رقم الحساب المربوط (WhatsApp Business) إن وُجد،
// وإلا هاتف الصالون الذي أدخله مالكه. يُعاد بصيغة دولية بلا + أو null إن لم يصلح للرابط.
export async function getSalonWhatsappNumber(tenantId: string, fallbackPhone?: string | null): Promise<string | null> {
  const acct = await prisma.whatsappAccount.findUnique({ where: { tenantId }, select: { displayPhone: true, status: true } });
  const raw = (acct && acct.status === 'ACTIVE' && acct.displayPhone) || fallbackPhone || '';
  const digits = normalizeWaPhone(raw);
  // رقم دولي معقول (8–15 خانة)؛ ما دون ذلك لا يصلح لـ wa.me
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function waMeLink(number: string, text?: string): string {
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

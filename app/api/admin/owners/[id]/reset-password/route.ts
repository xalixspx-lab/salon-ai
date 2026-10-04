import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { requireAdmin } from '@/lib/adminSession';
import { logAdminAction } from '@/lib/audit';

// يولّد كلمة مرور عشوائية جديدة لصاحب صالون ويعرضها مرة واحدة فقط للأدمن
// لإيصالها له يدويًا — لا يوجد نظام إرسال بريد إلكتروني بعد.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { id } = await params;

  const owner = await prisma.owner.findUnique({ where: { id } });
  if (!owner) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const newPassword = randomBytes(9).toString('base64url'); // ~12 حرف عشوائي
  const passwordHash = await hashPassword(newPassword);

  await prisma.owner.update({ where: { id }, data: { passwordHash, passwordChangedAt: new Date() } });
  await logAdminAction(guard.session, {
    action: 'OWNER_PASSWORD_RESET',
    targetType: 'OWNER',
    targetId: id,
    targetLabel: owner.email,
  });

  return NextResponse.json({ success: true, newPassword }, { status: 200 });
}

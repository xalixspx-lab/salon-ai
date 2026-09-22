import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { hashPassword, verifyPassword } from '@/lib/password';
import { limitOrResponse } from '@/lib/rateLimit';
import { logAdminAction } from '@/lib/audit';

export async function POST(request: Request) {
  const guard = await requireAdmin({ allowMustChange: true });
  if ('response' in guard) return guard.response;

  const limited = await limitOrResponse(`admin-chpw:${guard.session.adminId}`, 10, 15 * 60 * 1000);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const next = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (next.length < 8) {
    return NextResponse.json({ success: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, { status: 400 });
  }
  if (next === current) {
    return NextResponse.json({ success: false, error: 'اختر كلمة مرور مختلفة عن الحالية' }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { id: guard.session.adminId } });
  if (!admin || !(await verifyPassword(current, admin.passwordHash))) {
    return NextResponse.json({ success: false, error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 });
  }

  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(next), mustChangePassword: false } });
  await logAdminAction(guard.session, { action: 'ADMIN_PASSWORD_CHANGE', targetType: 'ADMIN', targetId: admin.id, targetLabel: admin.email });
  return NextResponse.json({ success: true });
}

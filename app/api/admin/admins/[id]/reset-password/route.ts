import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { hashPassword } from '@/lib/password';
import { generateTempPassword } from '@/lib/tempPassword';
import { logAdminAction } from '@/lib/audit';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { id } = await params;
  if (id === guard.session.adminId) {
    return NextResponse.json({ success: false, error: 'لتغيير كلمة مرورك استخدم صفحة تغيير كلمة المرور' }, { status: 400 });
  }
  const target = await prisma.admin.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const tempPassword = generateTempPassword();
  await prisma.admin.update({ where: { id }, data: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true, passwordChangedAt: new Date() } });
  await logAdminAction(guard.session, { action: 'ADMIN_PASSWORD_RESET', targetType: 'ADMIN', targetId: id, targetLabel: target.email });
  return NextResponse.json({ success: true, tempPassword });
}

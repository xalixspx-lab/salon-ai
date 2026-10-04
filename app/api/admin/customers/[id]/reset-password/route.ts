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
  const account = await prisma.customerAccount.findUnique({ where: { id } });
  if (!account) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const newPassword = generateTempPassword();
  await prisma.customerAccount.update({ where: { id }, data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() } });
  await logAdminAction(guard.session, { action: 'CUSTOMER_PASSWORD_RESET', targetType: 'CUSTOMER', targetId: id, targetLabel: account.email });
  return NextResponse.json({ success: true, newPassword });
}

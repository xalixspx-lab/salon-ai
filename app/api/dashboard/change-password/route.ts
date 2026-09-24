import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { hashPassword, verifyPassword } from '@/lib/password';
import { limitOrResponse } from '@/lib/rateLimit';
import { withTenantScope } from '@/lib/tenantScope';

async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const limited = await limitOrResponse(`owner-chpw:${session.ownerId}`, 10, 15 * 60 * 1000);
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

  const owner = await prisma.owner.findUnique({ where: { id: session.ownerId } });
  if (!owner || !(await verifyPassword(current, owner.passwordHash))) {
    return NextResponse.json({ success: false, error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 });
  }

  await prisma.owner.update({ where: { id: owner.id }, data: { passwordHash: await hashPassword(next) } });
  return NextResponse.json({ success: true });
}

export const POST = withTenantScope(POSTHandler);

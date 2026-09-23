import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminSession';
import { logAdminAction } from '@/lib/audit';

// حذف حساب مالك فقط (دون حذف صالونه وبياناته) — يقطع دخوله للوحة التحكم.
// الصالون يبقى قائمًا ويديره الأدمن حتى يُنشأ له مالك جديد أو يُحذف الصالون بالكامل.
// يتطلب كتابة بريد الحساب للتأكيد.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const owner = await prisma.owner.findUnique({ where: { id } });
  if (!owner) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (typeof body.confirmEmail !== 'string' || body.confirmEmail.trim().toLowerCase() !== owner.email) {
    return NextResponse.json({ success: false, error: 'البريد غير مطابق، لم يتم الحذف' }, { status: 400 });
  }

  await logAdminAction(guard.session, { action: 'OWNER_DELETE', targetType: 'OWNER', targetId: id, targetLabel: owner.email });
  await prisma.owner.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

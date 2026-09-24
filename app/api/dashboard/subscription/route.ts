import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { isPaidPlan } from '@/lib/plans';
import { resolveSubscription } from '@/lib/subscription';
import { getPlatformSettings } from '@/lib/platformSettings';
import { withTenantScope } from '@/lib/tenantScope';

async function GETHandler() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { plan: true, trialEndsAt: true },
  });
  if (!tenant) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const staffCount = await prisma.staff.count({ where: { tenantId: session.tenantId } });
  const { prices } = await getPlatformSettings();
  return NextResponse.json({ success: true, data: { ...resolveSubscription(tenant), staffCount, prices } });
}

// اختيار باقة. لا توجد بوابة دفع بعد: الاختيار يُطبَّق مباشرة (وضع الهيكل).
// عند ربط الدفع الفعلي يجب أن يمر هذا المسار عبر تأكيد الدفع قبل تغيير الباقة.
async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!isPaidPlan(body.plan)) {
    return NextResponse.json({ success: false, error: 'باقة غير صحيحة' }, { status: 400 });
  }

  const tenant = await prisma.tenant.update({
    where: { id: session.tenantId },
    data: { plan: body.plan },
    select: { plan: true, trialEndsAt: true },
  });
  return NextResponse.json({ success: true, data: resolveSubscription(tenant) });
}

export const GET = withTenantScope(GETHandler);
export const POST = withTenantScope(POSTHandler);

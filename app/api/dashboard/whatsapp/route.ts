import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { withTenantScope } from '@/lib/tenantScope';

// حالة ربط رقم واتساب للصالون (للقراءة فقط؛ الربط حاليًا من الإدارة)
async function GETHandler() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const acc = await prisma.whatsappAccount.findUnique({
    where: { tenantId: session.tenantId },
    select: { displayPhone: true, status: true },
  });
  return NextResponse.json({
    success: true,
    data: { connected: Boolean(acc) && acc!.status === 'ACTIVE', displayPhone: acc?.displayPhone ?? null },
  });
}

export const GET = withTenantScope(GETHandler);

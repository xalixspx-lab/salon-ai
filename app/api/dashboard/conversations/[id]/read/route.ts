import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { withTenantScope } from '@/lib/tenantScope';

async function POSTHandler(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const result = await prisma.conversation.updateMany({
    where: { id, tenantId: session.tenantId },
    data: { lastReadByOwnerAt: new Date() },
  });
  if (result.count === 0) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}

export const POST = withTenantScope(POSTHandler);

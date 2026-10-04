import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customerSession';
import { isUuid, readJsonObject } from '@/lib/chat';

// حظر العميل لصالون: يمنع المالك من إرسال رسائل جديدة أو بدء محادثة (مطلوب
// لمتاجر التطبيقات في أي تواصل بين مستخدمين) ويمكن التراجع عنه في أي وقت.
async function find(tenantId: string, accountId: string) {
  return prisma.conversation.findUnique({
    where: { tenantId_accountId: { tenantId, accountId } },
    select: { id: true, blockedByCustomerAt: true },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { tenantId } = await params;
  if (!isUuid(tenantId)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const conv = await find(tenantId, session.accountId);
  return NextResponse.json({ success: true, data: { blocked: Boolean(conv?.blockedByCustomerAt) } });
}

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { tenantId } = await params;
  if (!isUuid(tenantId)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const body = await readJsonObject(request);
  const blocked = body.blocked !== false;

  // الحظر قبل وجود محادثة (العميل لم يراسل بعد) ينشئ محادثة فارغة تحمل علامة الحظر
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  await prisma.conversation.upsert({
    where: { tenantId_accountId: { tenantId, accountId: session.accountId } },
    update: { blockedByCustomerAt: blocked ? new Date() : null },
    create: { tenantId, accountId: session.accountId, blockedByCustomerAt: blocked ? new Date() : null },
  });
  return NextResponse.json({ success: true, data: { blocked } });
}

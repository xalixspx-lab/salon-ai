import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { withTenantScope } from '@/lib/tenantScope';
import { SENDER_ROLE } from '@/lib/chat';

// قائمة محادثات الصالون (بريد وارد للمالك) — محادثة مستقلة لكل عميل، مرتبة
// بحسب آخر نشاط، مع عدد الرسائل غير المقروءة من كل عميل
async function GETHandler() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      account: { select: { name: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true, senderRole: true, createdAt: true } },
    },
  });

  const data = await Promise.all(
    conversations.map(async (c) => ({
      id: c.id,
      customerName: c.account.name,
      lastMessage: c.messages[0] ?? null,
      lastMessageAt: c.lastMessageAt,
      unreadCount: await prisma.message.count({
        where: {
          conversationId: c.id,
          senderRole: SENDER_ROLE.CUSTOMER,
          createdAt: { gt: c.lastReadByOwnerAt ?? new Date(0) },
        },
      }),
    }))
  );

  return NextResponse.json({ success: true, data });
}

// يبدأ المالك محادثة مع أحد عملائه (customerId من سجل CRM الخاص بصالونه) —
// يتطلب أن يكون لهذا العميل حساب دخول مرتبط (accountId)، وإلا فلا وجهة
// لإرسال المحادثة إليها. إن كانت المحادثة موجودة مسبقًا تُعاد كما هي
async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const customerId = typeof body.customerId === 'string' ? body.customerId : '';
  if (!customerId) return NextResponse.json({ success: false, error: 'customerId required' }, { status: 400 });

  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId: session.tenantId } });
  if (!customer) return NextResponse.json({ success: false, error: 'العميل غير موجود' }, { status: 404 });
  if (!customer.accountId) {
    return NextResponse.json({ success: false, error: 'هذا العميل غير مسجّل بحساب، لا يمكن بدء محادثة معه' }, { status: 400 });
  }

  const conversation = await prisma.conversation.upsert({
    where: { tenantId_accountId: { tenantId: session.tenantId, accountId: customer.accountId } },
    update: {},
    create: { tenantId: session.tenantId, accountId: customer.accountId },
  });

  return NextResponse.json({ success: true, data: conversation }, { status: 201 });
}

export const GET = withTenantScope(GETHandler);
export const POST = withTenantScope(POSTHandler);

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

export const GET = withTenantScope(GETHandler);

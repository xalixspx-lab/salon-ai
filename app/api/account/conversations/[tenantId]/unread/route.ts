import { NextResponse } from 'next/server';
import { WEB_CHAT_ENABLED, retiredResponse } from '@/lib/retired';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customerSession';
import { isUuid, SENDER_ROLE } from '@/lib/chat';

// عدد رسائل الصالون غير المقروءة في محادثة هذا العميل معه — خفيف، لشارة
// الويدجت المغلق (لا يغيّر حالة القراءة)
export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  if (!WEB_CHAT_ENABLED) return retiredResponse();
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { tenantId } = await params;
  if (!isUuid(tenantId)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const conversation = await prisma.conversation.findUnique({
    where: { tenantId_accountId: { tenantId, accountId: session.accountId } },
    select: { id: true, lastReadByCustomerAt: true },
  });
  if (!conversation) return NextResponse.json({ success: true, data: { unread: 0 } });

  const unread = await prisma.message.count({
    where: {
      conversationId: conversation.id,
      senderRole: SENDER_ROLE.OWNER,
      createdAt: { gt: conversation.lastReadByCustomerAt ?? new Date(0) },
    },
  });
  return NextResponse.json({ success: true, data: { unread } });
}

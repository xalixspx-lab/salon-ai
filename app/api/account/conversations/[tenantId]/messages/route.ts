import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customerSession';
import { sendMessage, SENDER_ROLE, MESSAGE_MAX_LENGTH } from '@/lib/chat';

// يجلب محادثة العميل مع هذا الصالون (وينشئها إن لم توجد بعد عند أول رسالة GET
// من واجهة الويدجت) — محادثة واحدة فقط لكل زوج (عميل، صالون)
async function findOrCreateConversation(tenantId: string, accountId: string) {
  const existing = await prisma.conversation.findUnique({ where: { tenantId_accountId: { tenantId, accountId } } });
  if (existing) return existing;
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, isPublished: true }, select: { id: true } });
  if (!tenant) return null;
  return prisma.conversation.create({ data: { tenantId, accountId } });
}

async function GETHandler(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { tenantId } = await params;

  const conversation = await prisma.conversation.findUnique({ where: { tenantId_accountId: { tenantId, accountId: session.accountId } } });
  if (!conversation) return NextResponse.json({ success: true, data: [] });

  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastReadByCustomerAt: new Date() } });

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, senderRole: true, body: true, createdAt: true },
  });

  return NextResponse.json({ success: true, data: messages });
}

async function POSTHandler(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { tenantId } = await params;

  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text || text.length > MESSAGE_MAX_LENGTH) {
    return NextResponse.json({ success: false, error: 'نص الرسالة مطلوب' }, { status: 400 });
  }

  const conversation = await findOrCreateConversation(tenantId, session.accountId);
  if (!conversation) return NextResponse.json({ success: false, error: 'الصالون غير موجود' }, { status: 404 });

  const message = await sendMessage(conversation.id, tenantId, SENDER_ROLE.CUSTOMER, text);
  return NextResponse.json({ success: true, data: message }, { status: 201 });
}

export const GET = GETHandler;
export const POST = POSTHandler;

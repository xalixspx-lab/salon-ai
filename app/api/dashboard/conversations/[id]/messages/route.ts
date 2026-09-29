import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { withTenantScope } from '@/lib/tenantScope';
import { sendMessage, SENDER_ROLE, MESSAGE_MAX_LENGTH } from '@/lib/chat';

async function GETHandler(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!conversation) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, senderRole: true, body: true, createdAt: true },
  });

  return NextResponse.json({ success: true, data: messages });
}

async function POSTHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!conversation) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text || text.length > MESSAGE_MAX_LENGTH) {
    return NextResponse.json({ success: false, error: 'نص الرسالة مطلوب' }, { status: 400 });
  }

  const message = await sendMessage(id, session.tenantId, SENDER_ROLE.OWNER, text);
  return NextResponse.json({ success: true, data: message }, { status: 201 });
}

export const GET = withTenantScope(GETHandler);
export const POST = withTenantScope(POSTHandler);

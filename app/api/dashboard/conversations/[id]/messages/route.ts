import { NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { withTenantScope } from '@/lib/tenantScope';
import { sendMessage, notifyChatMessage, loadThread, readJsonObject, isUuid, SENDER_ROLE, MESSAGE_MAX_LENGTH } from '@/lib/chat';
import { limitOrResponse } from '@/lib/rateLimit';
import { sendOwnerReply } from '@/lib/whatsapp';

async function GETHandler(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const conversation = await prisma.conversation.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!conversation) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true, data: await loadThread(id) });
}

async function POSTHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const limited = await limitOrResponse(`chat:own:${session.tenantId}`, 60, 60_000);
  if (limited) return limited;

  const conversation = await prisma.conversation.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!conversation) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  // محادثة واتساب: الرد يخرج للعميل عبر واجهة Meta الرسمية (ضمن نافذة 24 ساعة)
  if (conversation.contactId) {
    const body = await readJsonObject(request);
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    if (!text || text.length > MESSAGE_MAX_LENGTH) {
      return NextResponse.json({ success: false, error: 'نص الرسالة مطلوب' }, { status: 400 });
    }
    const r = await sendOwnerReply(id, session.tenantId, text);
    if (r.ok) return NextResponse.json({ success: true, data: r.message }, { status: 201 });
    const status = r.code === 'WINDOW_CLOSED' || r.code === 'NOT_CONNECTED' ? 409 : 502;
    return NextResponse.json({ success: false, error: r.code, code: r.code }, { status });
  }

  if (conversation.blockedByCustomerAt) {
    return NextResponse.json({ success: false, error: 'blocked', blocked: true }, { status: 403 });
  }

  const body = await readJsonObject(request);
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text || text.length > MESSAGE_MAX_LENGTH) {
    return NextResponse.json({ success: false, error: 'نص الرسالة مطلوب' }, { status: 400 });
  }

  const message = await sendMessage(id, session.tenantId, SENDER_ROLE.OWNER, text);
  after(() => notifyChatMessage(id, SENDER_ROLE.OWNER, message.id, text));
  return NextResponse.json({ success: true, data: message }, { status: 201 });
}

export const GET = withTenantScope(GETHandler);
export const POST = withTenantScope(POSTHandler);

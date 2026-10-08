import { NextResponse, after } from 'next/server';
import { WEB_CHAT_ENABLED, retiredResponse } from '@/lib/retired';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customerSession';
import { sendMessage, notifyChatMessage, loadThread, readJsonObject, isUuid, SENDER_ROLE, MESSAGE_MAX_LENGTH } from '@/lib/chat';
import { limitOrResponse } from '@/lib/rateLimit';
import { PUBLIC_TENANT } from '@/lib/visibility';
import { tr } from '@/lib/apiLocale';

// محادثة العميل مع هذا الصالون (تُنشأ عند أول رسالة) — محادثة واحدة فقط لكل
// زوج (عميل، صالون). الصالون غير المنشور (مخفي/موقوف) يُعامل كغير موجود حتى
// لو كانت المحادثة قائمة، فلا يستمر التراسل معه بعد إخفائه
async function findOrCreateConversation(tenantId: string, accountId: string) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, ...PUBLIC_TENANT }, select: { id: true } });
  if (!tenant) return null;
  const existing = await prisma.conversation.findUnique({ where: { tenantId_accountId: { tenantId, accountId } } });
  return existing ?? prisma.conversation.create({ data: { tenantId, accountId } });
}

async function GETHandler(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  if (!WEB_CHAT_ENABLED) return retiredResponse();
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { tenantId } = await params;
  if (!isUuid(tenantId)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const conversation = await prisma.conversation.findUnique({ where: { tenantId_accountId: { tenantId, accountId: session.accountId } } });
  if (!conversation) return NextResponse.json({ success: true, data: [] });

  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastReadByCustomerAt: new Date() } });

  return NextResponse.json({ success: true, data: await loadThread(conversation.id) });
}

async function POSTHandler(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  if (!WEB_CHAT_ENABLED) return retiredResponse();
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { tenantId } = await params;
  if (!isUuid(tenantId)) return NextResponse.json({ success: false, error: await tr('الصالون غير موجود') }, { status: 404 });

  const limited = await limitOrResponse(`chat:cust:${session.accountId}`, 30, 60_000);
  if (limited) return limited;

  const body = await readJsonObject(request);
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text || text.length > MESSAGE_MAX_LENGTH) {
    return NextResponse.json({ success: false, error: await tr('نص الرسالة مطلوب') }, { status: 400 });
  }

  const conversation = await findOrCreateConversation(tenantId, session.accountId);
  if (!conversation) return NextResponse.json({ success: false, error: await tr('الصالون غير موجود') }, { status: 404 });

  const message = await sendMessage(conversation.id, tenantId, SENDER_ROLE.CUSTOMER, text);
  after(() => notifyChatMessage(conversation.id, SENDER_ROLE.CUSTOMER, message.id, text));
  return NextResponse.json({ success: true, data: message }, { status: 201 });
}

export const GET = GETHandler;
export const POST = POSTHandler;

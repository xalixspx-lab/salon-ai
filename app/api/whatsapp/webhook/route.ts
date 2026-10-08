import { NextResponse, after } from 'next/server';
import { notifyChatMessage, SENDER_ROLE } from '@/lib/chat';
import { processInbound, processStatus } from '@/lib/whatsapp';
import { parseWebhook, verifySignature } from '@/lib/whatsappCore';

export const dynamic = 'force-dynamic';

const MAX_BODY = 1_000_000;

// التحقق من الاشتراك: Meta ترسل hub.challenge وتتوقع إرجاعه نصًا إن طابق الرمز
export async function GET(request: Request) {
  const url = new URL(request.url);
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (
    verifyToken &&
    url.searchParams.get('hub.mode') === 'subscribe' &&
    url.searchParams.get('hub.verify_token') === verifyToken
  ) {
    return new NextResponse(url.searchParams.get('hub.challenge') ?? '', { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// استقبال الرسائل وحالات التسليم. لا يُعالَج أي طلب بلا توقيع صحيح (X-Hub-Signature-256).
// الاستجابة 200 سريعة، والمعالجة آمنة التكرار (wa_message_id فريد) فإعادة Meta للإرسال لا تضر.
export async function POST(request: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return NextResponse.json({ success: false, error: 'not configured' }, { status: 503 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ success: false }, { status: 413 });
  if (!verifySignature(raw, request.headers.get('x-hub-signature-256'), secret)) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const { messages, statuses } = parseWebhook(payload);
  let failed = false;

  for (const m of messages) {
    try {
      const r = await processInbound(m);
      if (r.kind === 'stored') {
        after(() => notifyChatMessage(r.conversationId, SENDER_ROLE.CUSTOMER, r.messageId, m.text));
      }
    } catch (e) {
      failed = true;
      console.error('whatsapp inbound failed:', e);
    }
  }
  for (const s of statuses) {
    try {
      await processStatus(s);
    } catch (e) {
      failed = true;
      console.error('whatsapp status failed:', e);
    }
  }

  // 500 يجعل Meta تعيد المحاولة؛ آمن لأن المعالجة لا تكرر ما نُفِّذ
  return NextResponse.json({ success: !failed }, { status: failed ? 500 : 200 });
}

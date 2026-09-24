import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/customerSession';
import { clientIp } from '@/lib/rateLimit';
import { CONSENT_TYPES, currentConsent, hasCurrentDataConsent, recordConsent, type ConsentType } from '@/lib/legal';

// قراءة حالة موافقات العميل الحالية
export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const marketing = await currentConsent(session.accountId, CONSENT_TYPES.MARKETING);
  return NextResponse.json({
    success: true,
    data: { dataProcessing: await hasCurrentDataConsent(session.accountId), marketing: Boolean(marketing?.granted) },
  });
}

// تسجيل موافقة أو سحبها. معالجة البيانات لا تُسحب هنا (سحبها = حذف الحساب).
export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const type = body.type as ConsentType;
  const granted = body.granted === true;
  if (type !== CONSENT_TYPES.DATA_PROCESSING && type !== CONSENT_TYPES.MARKETING && type !== CONSENT_TYPES.WHATSAPP_COMMS) {
    return NextResponse.json({ success: false, error: 'نوع موافقة غير صالح' }, { status: 400 });
  }
  if (type === CONSENT_TYPES.DATA_PROCESSING && !granted) {
    return NextResponse.json({ success: false, error: 'لسحب موافقة معالجة البيانات احذف حسابك' }, { status: 400 });
  }

  await recordConsent({ accountId: session.accountId, type, granted, ip: clientIp(request) });
  return NextResponse.json({ success: true });
}

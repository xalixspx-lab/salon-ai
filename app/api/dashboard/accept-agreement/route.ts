import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { clientIp } from '@/lib/rateLimit';
import { hasAcceptedTenantAgreement, recordTenantAgreement } from '@/lib/legal';

// موافقة المالك على نسخة الاتفاقية الحالية (حسابات أنشأها الأدمن، أو بعد تعديل النسخة)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  // الأدمن الذي يدخل بدل المالك لا يوافق نيابة عنه
  if (session.imp) return NextResponse.json({ success: false, error: 'لا يمكن الموافقة نيابة عن المالك' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  if (body.accept !== true) return NextResponse.json({ success: false, error: 'الموافقة مطلوبة' }, { status: 400 });

  if (!(await hasAcceptedTenantAgreement(session.tenantId))) {
    await recordTenantAgreement({ tenantId: session.tenantId, ownerId: session.ownerId, ip: clientIp(request) });
  }
  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { CUSTOMER_SIDE_ENABLED, retiredResponse } from '@/lib/retired';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customerSession';
import { isUuid } from '@/lib/chat';
import { buildIcs } from '@/lib/ics';

// "أضف للتقويم": ملف .ics لموعد يخص العميل المسجّل نفسه فقط
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!CUSTOMER_SIDE_ENABLED) return retiredResponse();
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const appt = await prisma.appointment.findFirst({
    where: { id, customer: { accountId: session.accountId }, status: { in: ['CONFIRMED', 'PENDING_DEPOSIT', 'COMPLETED'] } },
    include: { service: { select: { name: true } }, tenant: { select: { id: true, name: true, addressText: true, phone: true } }, employee: { select: { name: true } } },
  });
  if (!appt || !appt.startTime || !appt.endTime || !appt.tenant) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const svc = (appt.service?.name as Record<string, string> | null) || {};
  const locale = new URL(request.url).searchParams.get('locale') === 'en' ? 'en' : 'ar';
  const service = (locale === 'en' ? svc.en || svc.ar : svc.ar || svc.en) || '';
  const origin = process.env.APP_URL?.replace(/\/$/, '') || new URL(request.url).origin;

  const ics = buildIcs({
    uid: appt.id,
    start: appt.startTime,
    end: appt.endTime,
    summary: `${service ? service + ' — ' : ''}${appt.tenant.name}`,
    description: [appt.employee?.name ? `${locale === 'en' ? 'Staff' : 'الموظف'}: ${appt.employee.name}` : '', appt.tenant.phone ? `${locale === 'en' ? 'Phone' : 'الهاتف'}: ${appt.tenant.phone}` : '']
      .filter(Boolean)
      .join('\n'),
    location: appt.tenant.addressText,
    url: `${origin}/${locale}/salons/${appt.tenant.id}`,
  });

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="appointment.ics"',
      'Cache-Control': 'private, no-store',
    },
  });
}

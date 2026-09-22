import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getCustomerSession } from '@/lib/customerSession';
import { limitOrResponse } from '@/lib/rateLimit';
import { sendVerificationEmail } from '@/lib/verification';

// GET: حالة تأكيد البريد للمستخدم الحالي (تستخدمها شارة التنبيه)
export async function GET(request: Request) {
  const audience = new URL(request.url).searchParams.get('audience') === 'customer' ? 'customer' : 'owner';
  const subjectId =
    audience === 'owner'
      ? (await getSession())?.ownerId
      : (await getCustomerSession())?.accountId;
  if (!subjectId) return NextResponse.json({ success: false }, { status: 401 });

  const account =
    audience === 'owner'
      ? await prisma.owner.findUnique({ where: { id: subjectId }, select: { emailVerifiedAt: true } })
      : await prisma.customerAccount.findUnique({ where: { id: subjectId }, select: { emailVerifiedAt: true } });
  return NextResponse.json({ success: true, verified: Boolean(account?.emailVerifiedAt) });
}

// يعيد إرسال رابط التأكيد للمستخدم المسجّل دخوله حاليًا (مالك أو عميل)
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const audience = body.audience === 'customer' ? 'customer' : 'owner';

  const subject =
    audience === 'owner'
      ? await getSession().then((s) => s && { id: s.ownerId })
      : await getCustomerSession().then((s) => s && { id: s.accountId });
  if (!subject) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const limited = await limitOrResponse(`resend:${subject.id}`, 3, 60 * 60 * 1000);
  if (limited) return limited;

  const account =
    audience === 'owner'
      ? await prisma.owner.findUnique({ where: { id: subject.id } })
      : await prisma.customerAccount.findUnique({ where: { id: subject.id } });
  if (!account) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  if (account.emailVerifiedAt) return NextResponse.json({ success: true, alreadyVerified: true });

  await sendVerificationEmail(request, audience, account.id, account.email);
  return NextResponse.json({ success: true });
}

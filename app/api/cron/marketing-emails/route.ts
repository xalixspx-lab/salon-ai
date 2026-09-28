import { NextResponse } from 'next/server';
import { appOrigin } from '@/lib/email';
import { sendReviewRequests, sendWinBackEmails } from '@/lib/marketingEmails';

export const dynamic = 'force-dynamic';

// تستدعيها مهمة Vercel Cron يوميًا (vercel.json). Vercel ترسل تلقائيًا
// Authorization: Bearer <CRON_SECRET> إذا وُجد المتغير في المشروع. بلا المتغير
// نرفض الطلب كليًا بدل ترك المسار مفتوحًا للعامة.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const origin = appOrigin(request);
  const reviewRequests = await sendReviewRequests(origin);
  const winBack = await sendWinBackEmails(origin);
  return NextResponse.json({ success: true, reviewRequests, winBack });
}

import { NextResponse } from 'next/server';
import { appOrigin } from '@/lib/email';
import { sendReviewRequests, sendWinBackEmails } from '@/lib/marketingEmails';
import { sendAppointmentReminders } from '@/lib/reminders';
import { runDueReports } from '@/lib/reports';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// مهمة يومية واحدة تجمع كل المهام المجدولة (خطة Vercel المجانية تسمح بمهمتين فقط):
// التقارير الدورية، تذكير المواعيد، والبريد التسويقي. فشل مهمة لا يوقف الباقي.
// الحماية: Authorization: Bearer CRON_SECRET (Vercel ترسله تلقائيًا إن وُجد المتغير).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const origin = appOrigin(request);
  const run = async <T,>(name: string, fn: () => Promise<T>) => {
    try {
      return await fn();
    } catch (e) {
      console.error(`cron ${name} failed:`, e);
      return { error: e instanceof Error ? e.message : 'error' };
    }
  };

  const reports = await run('reports', () => runDueReports(new Date(), origin));
  const reminders = await run('reminders', () => sendAppointmentReminders());
  const reviewRequests = await run('reviewRequests', () => sendReviewRequests(origin));
  const winBack = await run('winBack', () => sendWinBackEmails(origin));
  return NextResponse.json({ success: true, reports, reminders, reviewRequests, winBack });
}

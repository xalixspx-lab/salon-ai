import { NextResponse } from 'next/server';
import { sendAppointmentReminders } from '@/lib/reminders';

export const dynamic = 'force-dynamic';

// Vercel Cron يوميًا (vercel.json) — نفس حماية CRON_SECRET لمسار البريد التسويقي
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ success: true, ...(await sendAppointmentReminders()) });
}

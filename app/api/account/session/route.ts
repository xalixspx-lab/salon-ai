import { NextResponse } from 'next/server';
import { CUSTOMER_SIDE_ENABLED, retiredResponse } from '@/lib/retired';
import { getCustomerSession } from '@/lib/customerSession';

// نقطة خفيفة للمكوّنات على جانب العميل (مثل نموذج الحجز) للتحقق هل فيه
// عميل مسجّل دخوله حاليًا، بدون الحاجة لفك تشفير الكوكي بنفسها.
export async function GET() {
  if (!CUSTOMER_SIDE_ENABLED) return retiredResponse();
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ success: true, loggedIn: false }, { status: 200 });
  }
  return NextResponse.json(
    { success: true, loggedIn: true, name: session.name, email: session.email },
    { status: 200 }
  );
}

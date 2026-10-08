import { NextResponse } from 'next/server';
import { tr } from '@/lib/apiLocale';

// قرار التحوّل (أكتوبر 2026): المنصة موجّهة لأصحاب الصالونات فقط، والعميل يتواصل مع الصالون
// عبر واتساب الصالون. فنُعطّل مؤقتًا — دون حذف أي كود أو بيانات — كل ما يخص حساب العميل
// والحجز من داخل الموقع والمحادثة المباشرة (ويب). قلب المفتاح إلى true يعيدها كما كانت.
export const CUSTOMER_SIDE_ENABLED = false;
export const WEB_CHAT_ENABLED = false;

export async function retiredResponse() {
  return NextResponse.json({ success: false, error: await tr('هذه الخدمة متوقفة حاليًا'), code: 'RETIRED' }, { status: 410 });
}

import { NextResponse } from 'next/server';
import { clientIp, limitOrResponse } from '@/lib/rateLimit';

// نقبل فقط روابط خرائط قوقل المعروفة (تم إصلاح ثغرة SSRF: كان الفحص
// url.includes('goo.gl') يسمح بأي رابط يحتوي النص، فيجلبه السيرفر).
const ALLOWED_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'www.google.com',
  'google.com',
  'maps.google.com',
  'www.google.com.bh',
  'google.com.bh',
]);
const SHORT_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl']);
const MAX_REDIRECTS = 3;

function parseAllowed(raw: string): URL | null {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && ALLOWED_HOSTS.has(u.hostname) ? u : null;
  } catch {
    return null;
  }
}

// يتتبع التحويلات يدويًا ويتحقق من كل قفزة حتى لا يُحوَّل السيرفر لعنوان داخلي
async function resolveShortUrl(start: URL): Promise<URL | null> {
  let current = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    if (!SHORT_HOSTS.has(current.hostname)) return current;
    const res = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
    const location = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !location) return current;
    const next = parseAllowed(new URL(location, current).toString());
    if (!next) return null;
    current = next;
  }
  return null;
}

export async function POST(req: Request) {
  const limited = await limitOrResponse(`parse-location:${clientIp(req)}`, 30, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const { url } = await req.json();
    if (typeof url !== 'string' || !url) {
      return NextResponse.json({ error: 'الرابط مطلوب' }, { status: 400 });
    }

    const allowed = parseAllowed(url.trim());
    if (!allowed) {
      return NextResponse.json({ error: 'الرابط يجب أن يكون من خرائط قوقل' }, { status: 400 });
    }

    const resolved = await resolveShortUrl(allowed);
    if (!resolved) {
      return NextResponse.json({ error: 'تعذّر قراءة الرابط' }, { status: 400 });
    }
    const finalUrl = resolved.toString();

    // الإحداثيات تأتي غالبًا بصيغة @lat,lng أو ?q=lat,lng
    const match = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || finalUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      return NextResponse.json({ lat: parseFloat(match[1]), lng: parseFloat(match[2]) });
    }

    return NextResponse.json(
      { error: 'لم يتم العثور على إحداثيات داخل هذا الرابط، تأكد أنه رابط موقع قوقل صحيح.' },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'فشل في تحليل الرابط' }, { status: 500 });
  }
}

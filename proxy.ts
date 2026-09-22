import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const handleIntlRouting = createMiddleware(routing);

// nonce فريد لكل طلب: يسمح لسكربتات Next.js الداخلية بالعمل مع سياسة CSP صارمة
// بدون فتح 'unsafe-inline' (راجع: https://nextjs.org/docs/app/guides/content-security-policy)
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // نمط ثابت: React يضبط بعض الأنماط عبر السمة style مباشرة، ولا يوجد nonce عملي لها هنا
    "style-src 'self' 'unsafe-inline'",
    // Supabase للشعارات، بلاط خرائط OpenStreetMap، وأيقونات Leaflet من unpkg
    "img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org https://unpkg.com",
    "font-src 'self' data:",
    // بحث المدينة (Nominatim) من نموذج تسجيل صالون جديد + استدعاءات الموقع نفسه
    "connect-src 'self' https://nominatim.openstreetmap.org",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export default function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  const intlResponse = handleIntlRouting(request);

  // تحويل لغة (redirect) لا يعرض HTML، فلا حاجة لتمرير nonce — نكتفي بإضافة CSP
  if (intlResponse.headers.get('location')) {
    intlResponse.headers.set('Content-Security-Policy', csp);
    return intlResponse;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // ندمج كل ما ضبطه next-intl (كوكي اللغة، إعادة الكتابة...) على استجابتنا
  intlResponse.headers.forEach((value, key) => response.headers.set(key, value));
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

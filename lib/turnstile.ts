// تحقّق Cloudflare Turnstile (مجاني) من طرف السيرفر. إن لم يُضبط المفتاح
// السري بعد فالتحقق "يمرّ" تلقائيًا (نفس نمط التدرّج المستخدم لكل تكاملات
// المنصة الأخرى) — الحقل الفخّي (honeypot) يبقى فعالاً دائمًا بلا شرط.
export async function verifyTurnstileToken(token: unknown, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== 'string' || !token) return false;

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return false;
  }
}

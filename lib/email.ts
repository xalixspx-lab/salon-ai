// إرسال البريد عبر Resend إذا ضُبط RESEND_API_KEY و EMAIL_FROM. بدون ذلك
// (بيئة التطوير) نطبع الرسالة في سجل السيرفر حتى يمكن اختبار الروابط.
export async function sendEmail(opts: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!key || !from) {
    console.log(`[email:dev] to=${opts.to} subject="${opts.subject}"\n${opts.text}`);
    return { delivered: false };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text }),
  });
  if (!res.ok) {
    console.error('Email send failed', res.status, await res.text());
    return { delivered: false };
  }
  return { delivered: true };
}

export function appOrigin(request: Request): string {
  return process.env.APP_URL?.replace(/\/$/, '') || new URL(request.url).origin;
}

// رسالة ترحيب لحساب أنشأه الأدمن مباشرة (مالك صالون أو عميل)، تحمل كلمة
// المرور المؤقتة نصًا ورابط تسجيل الدخول — لا يوجد رابط رمزي هنا، القيمة ذاتها بالنص.
export function welcomeEmail(kind: 'owner' | 'customer', tempPassword: string, loginLink: string, locale: string) {
  const ar = locale !== 'en';
  const copy = {
    owner: ar
      ? { subject: 'تم إنشاء حساب صالونك — Salon AI', intro: 'أنشأ فريق Salon AI حساب صالونك. استخدم كلمة المرور المؤقتة التالية لتسجيل الدخول، ثم غيّرها من إعدادات لوحة التحكم.', cta: 'تسجيل الدخول' }
      : { subject: 'Your salon account was created — Salon AI', intro: 'The Salon AI team created your salon account. Use the temporary password below to log in, then change it from your dashboard settings.', cta: 'Log in' },
    customer: ar
      ? { subject: 'تم إنشاء حسابك — Salon AI', intro: 'أنشأ فريق Salon AI حسابك. استخدم كلمة المرور المؤقتة التالية لتسجيل الدخول، ثم غيّرها من صفحة حسابك.', cta: 'تسجيل الدخول' }
      : { subject: 'Your account was created — Salon AI', intro: 'The Salon AI team created your account. Use the temporary password below to log in, then change it from your account page.', cta: 'Log in' },
  }[kind];
  const label = ar ? 'كلمة المرور المؤقتة' : 'Temporary password';
  return {
    subject: copy.subject,
    text: `${copy.intro}\n\n${label}: ${tempPassword}\n\n${loginLink}`,
    html: `<div dir="${ar ? 'rtl' : 'ltr'}" style="font-family:sans-serif"><p>${copy.intro}</p><p style="font-size:12px;color:#888">${label}</p><p style="font-family:monospace;font-size:18px;background:#f4f4f5;padding:10px 14px;border-radius:8px;display:inline-block">${tempPassword}</p><p><a href="${loginLink}">${copy.cta}</a></p></div>`,
  };
}

export function actionEmail(kind: 'reset' | 'verify', link: string, locale: string) {
  const ar = locale !== 'en';
  const copy = {
    reset: ar
      ? { subject: 'استعادة كلمة المرور — Salon AI', intro: 'وصلنا طلب لإعادة تعيين كلمة المرور. الرابط صالح لمدة ساعة.', cta: 'إعادة تعيين كلمة المرور' }
      : { subject: 'Reset your password — Salon AI', intro: 'We received a request to reset your password. The link is valid for one hour.', cta: 'Reset password' },
    verify: ar
      ? { subject: 'تأكيد بريدك الإلكتروني — Salon AI', intro: 'أكّد بريدك الإلكتروني لإكمال تفعيل حسابك.', cta: 'تأكيد البريد' }
      : { subject: 'Confirm your email — Salon AI', intro: 'Confirm your email to finish activating your account.', cta: 'Confirm email' },
  }[kind];
  const ignore = ar ? 'إذا لم تطلب ذلك، تجاهل هذه الرسالة.' : "If you didn't request this, ignore this email.";
  return {
    subject: copy.subject,
    text: `${copy.intro}\n${link}\n\n${ignore}`,
    html: `<div dir="${ar ? 'rtl' : 'ltr'}" style="font-family:sans-serif"><p>${copy.intro}</p><p><a href="${link}">${copy.cta}</a></p><p style="color:#888;font-size:12px">${ignore}</p></div>`,
  };
}

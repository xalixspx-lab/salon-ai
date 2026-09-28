'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';

type Audience = 'owner' | 'customer' | 'admin';

const copy = {
  ar: {
    forgotTitle: 'استعادة كلمة المرور',
    forgotHint: 'اكتب بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.',
    email: 'البريد الإلكتروني',
    send: 'إرسال الرابط',
    sentDone: 'إذا كان البريد مسجلًا لدينا فقد أرسلنا إليه رابط الاستعادة.',
    resetTitle: 'كلمة مرور جديدة',
    password: 'كلمة المرور الجديدة (8 أحرف على الأقل)',
    save: 'حفظ كلمة المرور',
    resetDone: 'تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.',
    login: 'تسجيل الدخول',
    verifying: 'جاري تأكيد البريد...',
    verifyDone: 'تم تأكيد بريدك الإلكتروني',
    verifyFailed: 'تعذّر تأكيد البريد',
    fail: 'حدث خطأ، حاول مرة أخرى',
  },
  en: {
    forgotTitle: 'Reset your password',
    forgotHint: "Enter your email and we'll send you a reset link.",
    email: 'Email',
    send: 'Send link',
    sentDone: 'If that email is registered, we sent it a reset link.',
    resetTitle: 'Choose a new password',
    password: 'New password (8+ characters)',
    save: 'Save password',
    resetDone: 'Your password was changed. You can log in now.',
    login: 'Log in',
    verifying: 'Confirming your email...',
    verifyDone: 'Your email is confirmed',
    verifyFailed: 'Could not confirm your email',
    fail: 'Something went wrong, please try again',
  },
};

// dark = صفحات الأدمن فقط (تُحدَّد بـ audience === 'admin')، بهوية داكنة+ذهبية
// مختلفة عمدًا عن التدرج الأزرق العام — نفس إشارة "هذه منطقة مقيّدة منفصلة"
// المتّبعة في بقية صفحات الأدمن.
function Card({ locale, title, dark, children }: { locale: string; title: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 ${dark ? 'bg-slate-900' : 'bg-gradient-to-b from-brand-50 via-white to-white'}`}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div
        className={
          dark
            ? 'max-w-md w-full bg-slate-800 shadow-xl rounded-2xl border border-slate-700 p-8 text-white'
            : 'max-w-md w-full bg-white shadow-xl shadow-brand-900/5 rounded-2xl border border-brand-100 p-8 text-black'
        }
      >
        <h1 className={`text-2xl font-bold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
        {children}
      </div>
    </div>
  );
}

const fieldClass = (dark?: boolean) =>
  `w-full px-3 py-2 rounded-xl text-left focus:outline-none focus:ring-2 ${
    dark
      ? 'border border-slate-600 bg-slate-900 text-white focus:ring-gold-500'
      : 'border border-gray-200 focus:ring-brand-500'
  }`;

const buttonClass = (dark?: boolean) =>
  `w-full py-2.5 rounded-xl font-semibold disabled:opacity-50 transition ${
    dark ? 'bg-gold-500 text-slate-900 hover:bg-gold-400' : 'bg-brand-600 text-white hover:bg-brand-700'
  }`;

const loginPath = (locale: string, audience?: Audience) =>
  audience === 'admin' ? `/${locale}/admin/login` : `/${locale}/login`;

// audience اختياري هنا: نموذج الدخول الموحّد (صاحب صالون/عميل) لا يعرف نوع
// الحساب مسبقًا، فيُترك فارغًا والخادم يتعرّف عليه من البريد. الأدمن وحده
// يمرّ صراحة لأن صفحته منفصلة عمدًا.
export function ForgotPasswordForm({ locale, audience }: { locale: string; audience?: Audience }) {
  const c = copy[locale === 'en' ? 'en' : 'ar'];
  const dark = audience === 'admin';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audience ? { email, audience } : { email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.fail);
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card locale={locale} title={c.forgotTitle} dark={dark}>
      {done ? (
        <p className="text-emerald-700 bg-emerald-50 rounded-xl p-3 text-sm">{c.sentDone}</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className={`text-sm ${dark ? 'text-slate-300' : 'text-gray-500'}`}>{c.forgotHint}</p>
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}
          <div>
            <label className={`block text-sm font-medium mb-1 ${dark ? 'text-slate-200' : 'text-gray-700'}`}>{c.email}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" className={fieldClass(dark)} />
          </div>
          <button disabled={loading} className={buttonClass(dark)}>
            {loading ? '...' : c.send}
          </button>
        </form>
      )}
      <p className="mt-4 text-center text-sm">
        <a href={loginPath(locale, audience)} className={dark ? 'text-gold-400 hover:underline' : 'text-brand-600 hover:underline'}>{c.login}</a>
      </p>
    </Card>
  );
}

export function ResetPasswordForm({ locale, audience, token }: { locale: string; audience: Audience; token: string }) {
  const c = copy[locale === 'en' ? 'en' : 'ar'];
  const dark = audience === 'admin';
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, audience, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.fail);
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card locale={locale} title={c.resetTitle} dark={dark}>
      {done ? (
        <>
          <p className="text-emerald-700 bg-emerald-50 rounded-xl p-3 text-sm">{c.resetDone}</p>
          <p className="mt-4 text-center text-sm">
            <a href={loginPath(locale, audience)} className={dark ? 'text-gold-400 hover:underline' : 'text-brand-600 hover:underline'}>{c.login}</a>
          </p>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}
          <div>
            <label className={`block text-sm font-medium mb-1 ${dark ? 'text-slate-200' : 'text-gray-700'}`}>{c.password}</label>
            <input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" className={fieldClass(dark)} />
          </div>
          <button disabled={loading} className={buttonClass(dark)}>
            {loading ? '...' : c.save}
          </button>
        </form>
      )}
    </Card>
  );
}

export function VerifyEmailStatus({ locale, audience, token }: { locale: string; audience: Audience; token: string }) {
  const c = copy[locale === 'en' ? 'en' : 'ar'];
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // الرمز يُستهلك مرة واحدة، فلا نكرر الطلب (StrictMode)
    ran.current = true;
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, audience }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || c.fail);
        setState('ok');
      })
      .catch((err) => {
        setError(err.message);
        setState('error');
      });
  }, [token, audience, c.fail]);

  const title = state === 'ok' ? c.verifyDone : state === 'error' ? c.verifyFailed : c.verifying;
  const dark = audience === 'admin';

  return (
    <Card locale={locale} title={title} dark={dark}>
      {state === 'error' && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}
      {state !== 'loading' && (
        <p className="mt-4 text-center text-sm">
          <a href={loginPath(locale, audience)} className={dark ? 'text-gold-400 hover:underline' : 'text-brand-600 hover:underline'}>{c.login}</a>
        </p>
      )}
    </Card>
  );
}

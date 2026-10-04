'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LocationPicker from '@/components/LocationPicker';
import HoneypotField from '@/components/HoneypotField';
import TurnstileWidget from '@/components/TurnstileWidget';
import LegalCheckbox from '@/components/LegalCheckbox';

export default function NewSalonForm() {
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';
  const L = (a: string, e: string) => (locale === 'en' ? e : a);
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [website, setWebsite] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/salons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          city,
          ownerName,
          email,
          password,
          lat: lat !== '' ? lat : undefined,
          lng: lng !== '' ? lng : undefined,
          website,
          turnstileToken,
          acceptTerms,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create salon');
      }

      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white shadow-xl shadow-brand-900/5 rounded-2xl border border-brand-100 p-6 sm:p-8 text-black mb-10">
        <h1 className="text-2xl font-bold mb-1 text-gray-900">{L('سجّل صالونك وأنشئ حسابك (Salon AI)', 'Register your salon and create your account (Salon AI)')}</h1>
        <p className="text-sm text-gray-500 mb-6">{L('تسجيل صالونك ينشئ لك حساب مالك تقدر تدخل فيه لاحقًا وتدير صالونك من لوحة التحكم.', 'Registering creates an owner account you can use to log in later and manage your salon from the dashboard.')}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <HoneypotField value={website} onChange={setWebsite} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{L('اسم الصالون', 'Salon name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-black"
              placeholder={L('مثال: صالون رتاج للتجميل', 'e.g. Rataj Beauty Salon')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-brand-50/60 rounded-xl border border-brand-100">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{L('اسمك (المالك)', 'Your name (owner)')}</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-black"
                placeholder={L('مثال: محمد العلي', 'e.g. Mohamed Al Ali')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{L('البريد الإلكتروني', 'Email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-black text-left"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{L('كلمة المرور', 'Password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                dir="ltr"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-black text-left"
                placeholder={L('8 أحرف على الأقل', 'At least 8 characters')}
              />
            </div>
          </div>

          <LocationPicker
            city={city}
            onCityChange={setCity}
            lat={lat}
            lng={lng}
            onLatChange={setLat}
            onLngChange={setLng}
          />

          <LegalCheckbox kind="salon" checked={acceptTerms} onChange={setAcceptTerms} />

          <TurnstileWidget onVerify={setTurnstileToken} />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-2.5 px-4 rounded-xl font-semibold hover:bg-brand-700 transition disabled:opacity-50 mt-4"
          >
            {loading ? L('جاري الإنشاء...', 'Creating...') : L('إنشاء الصالون والحساب', 'Create salon and account')}
          </button>

          <p className="text-center text-sm text-gray-500">
            {L('عندك حساب صالون؟', 'Already have a salon account?')}{' '}
            <a href={`/${locale}/login`} className="text-brand-600 font-medium hover:underline">
              {L('سجّل الدخول', 'Log in')}
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

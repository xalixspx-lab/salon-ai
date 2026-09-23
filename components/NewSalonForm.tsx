'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LocationPicker from '@/components/LocationPicker';
import HoneypotField from '@/components/HoneypotField';
import TurnstileWidget from '@/components/TurnstileWidget';

export default function NewSalonForm() {
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [website, setWebsite] = useState('');
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
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow-md rounded-lg border border-gray-100 text-black mb-10">
      <h1 className="text-2xl font-bold mb-1 text-gray-800">سجّل صالونك وأنشئ حسابك (Salon AI)</h1>
      <p className="text-sm text-gray-500 mb-6">تسجيل صالونك ينشئ لك حساب مالك تقدر تدخل فيه لاحقًا وتدير صالونك من لوحة التحكم.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <HoneypotField value={website} onChange={setWebsite} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم الصالون</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            placeholder="مثال: صالون رتاج للتجميل"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md border border-gray-100">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">اسمك (المالك)</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="مثال: محمد العلي"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-left"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              dir="ltr"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-left"
              placeholder="8 أحرف على الأقل"
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

        <TurnstileWidget onVerify={setTurnstileToken} />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50 mt-4"
        >
          {loading ? 'جاري الإنشاء...' : 'إنشاء الصالون والحساب'}
        </button>

        <p className="text-center text-sm text-gray-500">
          عندك حساب صالون؟{' '}
          <a href={`/${locale}/login`} className="text-blue-600 font-medium hover:underline">
            سجّل الدخول
          </a>
        </p>
      </form>
    </div>
  );
}

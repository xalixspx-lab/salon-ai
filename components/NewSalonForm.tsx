'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import 'leaflet/dist/leaflet.css';

export default function NewSalonForm() {
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [parsingUrl, setParsingUrl] = useState(false);
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    import('leaflet').then((L) => {
      LRef.current = L;
      const customIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      const container = document.getElementById('picker-map');
      if (container && (container as any)._leaflet_id) {
        (container as any)._leaflet_id = null;
      }

      const map = L.map('picker-map').setView([26.2285, 50.5860], 11);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        updateLocation(lat, lng, customIcon);
      });
    });
  }, [isMounted]);

  function updateLocation(newLat: number, newLng: number, icon: any) {
    const roundedLat = parseFloat(newLat.toFixed(6));
    const roundedLng = parseFloat(newLng.toFixed(6));
    setLat(roundedLat);
    setLng(roundedLng);

    if (mapRef.current && LRef.current) {
      if (markerRef.current) {
        markerRef.current.setLatLng([roundedLat, roundedLng]);
      } else {
        markerRef.current = LRef.current.marker([roundedLat, roundedLng], { icon }).addTo(mapRef.current);
      }
      mapRef.current.flyTo([roundedLat, roundedLng], 15, { animate: true, duration: 1.0 });
    }
  };

  // دالة البحث عن المدينة بالنص
  const handleSearchCity = async () => {
    if (!city.trim()) return;
    setSearching(true);
    setError('');

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
      const data = await response.json();

      if (data && data.length > 0) {
        const foundLat = parseFloat(data[0].lat);
        const foundLng = parseFloat(data[0].lon);
        
        if (LRef.current) {
          const customIcon = LRef.current.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          });
          updateLocation(foundLat, foundLng, customIcon);
        }
      } else {
        setError('لم يتم العثور على هذه المدينة، يرجى النقر يدوياً على الخريطة.');
      }
    } catch (err) {
      setError('حدث خطأ أثناء البحث عن المدينة.');
    } finally {
      setSearching(false);
    }
  };

  // دالة استخراج الإحداثيات من رابط قوقل ماب
  const handleParseMapUrl = async () => {
    if (!mapUrl.trim()) return;
    setParsingUrl(true);
    setError('');

    try {
      const res = await fetch('/api/parse-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mapUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل في استخراج الموقع من الرابط');
      }

      if (LRef.current) {
        const customIcon = LRef.current.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });
        updateLocation(data.lat, data.lng, customIcon);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setParsingUrl(false);
    }
  };

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المدينة (الخليج العربي)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="مثال: المنامة، المحرق، دبي"
            />
            <button
              type="button"
              onClick={handleSearchCity}
              disabled={searching}
              className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition text-sm whitespace-nowrap disabled:opacity-50"
            >
              {searching ? 'جاري البحث...' : 'بحث بالمدينة'}
            </button>
          </div>
        </div>

        {/* ميزة لصق رابط قوقل ماب */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">🔗 رابط موقع الصالون (Google Maps Link)</label>
          <div className="flex gap-2" dir="ltr">
            <button
              type="button"
              onClick={handleParseMapUrl}
              disabled={parsingUrl}
              className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition text-sm whitespace-nowrap disabled:opacity-50 order-2"
            >
              {parsingUrl ? 'جاري التحليل...' : 'استخراج الإحداثيات'}
            </button>
            <input
              type="url"
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black order-1 text-left"
              placeholder="https://maps.app.goo.gl/..."
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">ألصق رابط اللوكيشن المُرسل من قوقل ماب، واضغط &quot;استخراج الإحداثيات&quot; لتحديث الخريطة تلقائياً.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            📍 الخريطة التفاعلية:
          </label>
          <div id="picker-map" className="w-full h-[300px] rounded-lg border border-gray-300 z-0 mb-2"></div>
        </div>

        <div className="grid grid-cols-2 gap-2" dir="ltr">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">خط العرض (Lat)</label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value ? parseFloat(e.target.value) : '')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-gray-50"
              placeholder="تلقائي"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">خط الطول (Lng)</label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value ? parseFloat(e.target.value) : '')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-gray-50"
              placeholder="تلقائي"
            />
          </div>
        </div>

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
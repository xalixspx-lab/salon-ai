'use client';

import { useEffect, useId, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

const ICON = {
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41] as [number, number],
  iconAnchor: [12, 41] as [number, number],
};

// منتقي موقع تفاعلي مشترك: خريطة بعلامة قابلة للسحب، تحديد الموقع الحالي عبر
// GPS، بحث بالمدينة، واستخراج إحداثيات من رابط قوقل ماب. يُستخدم في تسجيل
// الصالون العام ولوحة الأدمن معًا.
export default function LocationPicker({
  city,
  onCityChange,
  lat,
  lng,
  onLatChange,
  onLngChange,
}: {
  city: string;
  onCityChange: (v: string) => void;
  lat: number | '';
  lng: number | '';
  onLatChange: (v: number | '') => void;
  onLngChange: (v: number | '') => void;
}) {
  const [mapUrl, setMapUrl] = useState('');
  const [searching, setSearching] = useState(false);
  const [parsingUrl, setParsingUrl] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const mapId = useRef(`location-picker-${reactId}`);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    import('leaflet').then((L) => {
      LRef.current = L;

      const container = document.getElementById(mapId.current);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (container && (container as any)._leaflet_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (container as any)._leaflet_id = null;
      }

      const startLat = typeof lat === 'number' ? lat : 26.2285;
      const startLng = typeof lng === 'number' ? lng : 50.586;
      const map = L.map(mapId.current).setView([startLat, startLng], 11);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      if (typeof lat === 'number' && typeof lng === 'number') {
        placeMarker(lat, lng, { skipFly: true });
      }

      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        placeMarker(e.latlng.lat, e.latlng.lng);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]);

  function placeMarker(newLat: number, newLng: number, opts: { skipFly?: boolean } = {}) {
    const roundedLat = parseFloat(newLat.toFixed(6));
    const roundedLng = parseFloat(newLng.toFixed(6));
    onLatChange(roundedLat);
    onLngChange(roundedLng);

    if (!mapRef.current || !LRef.current) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([roundedLat, roundedLng]);
    } else {
      markerRef.current = LRef.current
        .marker([roundedLat, roundedLng], { icon: LRef.current.icon(ICON), draggable: true })
        .addTo(mapRef.current);
      // السحب المباشر للعلامة يحدّث الإحداثيات فورًا
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng();
        const dLat = parseFloat(pos.lat.toFixed(6));
        const dLng = parseFloat(pos.lng.toFixed(6));
        onLatChange(dLat);
        onLngChange(dLng);
      });
    }
    if (!opts.skipFly) {
      mapRef.current.flyTo([roundedLat, roundedLng], 15, { animate: true, duration: 1.0 });
    }
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع الجغرافي.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        placeMarker(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setError('تعذّر الوصول لموقعك الحالي. تأكد من السماح بإذن الموقع.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleClear = () => {
    onLatChange('');
    onLngChange('');
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  };

  const handleSearchCity = async () => {
    if (!city.trim()) return;
    setSearching(true);
    setError('');
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        placeMarker(parseFloat(data[0].lat), parseFloat(data[0].lon));
      } else {
        setError('لم يتم العثور على هذه المدينة، يرجى النقر يدوياً على الخريطة.');
      }
    } catch {
      setError('حدث خطأ أثناء البحث عن المدينة.');
    } finally {
      setSearching(false);
    }
  };

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
      if (!res.ok) throw new Error(data.error || 'فشل في استخراج الموقع من الرابط');
      placeMarker(data.lat, data.lng);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    } finally {
      setParsingUrl(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">المدينة</label>
        <div className="flex gap-2">
          <input value={city} onChange={(e) => onCityChange(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black" placeholder="مثال: المنامة، المحرق، دبي" />
          <button type="button" onClick={handleSearchCity} disabled={searching} className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm whitespace-nowrap disabled:opacity-50">
            {searching ? 'جاري البحث...' : 'بحث بالمدينة'}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">🔗 رابط موقع الصالون (Google Maps Link)</label>
        <div className="flex gap-2" dir="ltr">
          <button type="button" onClick={handleParseMapUrl} disabled={parsingUrl} className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm whitespace-nowrap disabled:opacity-50 order-2">
            {parsingUrl ? 'جاري التحليل...' : 'استخراج الإحداثيات'}
          </button>
          <input type="url" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} className="w-full px-3 py-2 border rounded-md text-black order-1 text-left" placeholder="https://maps.app.goo.gl/..." />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleUseMyLocation} disabled={locating} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm whitespace-nowrap disabled:opacity-50">
          📍 {locating ? 'جاري التحديد...' : 'استخدم موقعي الحالي'}
        </button>
        <button type="button" onClick={handleClear} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-sm whitespace-nowrap">
          مسح التحديد
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">📍 الخريطة التفاعلية (اسحب العلامة أو انقر لتحديد الموقع بدقة)</label>
        <div id={mapId.current} className="w-full h-[300px] rounded-lg border border-slate-300 z-0" />
      </div>

      <div className="grid grid-cols-2 gap-2" dir="ltr">
        <input
          type="number"
          step="any"
          value={lat}
          onChange={(e) => onLatChange(e.target.value ? parseFloat(e.target.value) : '')}
          className="px-3 py-2 border rounded-md text-black bg-slate-50"
          placeholder="Lat"
        />
        <input
          type="number"
          step="any"
          value={lng}
          onChange={(e) => onLngChange(e.target.value ? parseFloat(e.target.value) : '')}
          className="px-3 py-2 border rounded-md text-black bg-slate-50"
          placeholder="Lng"
        />
      </div>
    </div>
  );
}

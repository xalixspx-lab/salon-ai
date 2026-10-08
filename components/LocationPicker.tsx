'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import 'leaflet/dist/leaflet.css';

const ICON = {
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
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
  const routeParams = useParams();
  const L = (a: string, e: string) => (routeParams.locale === 'en' ? e : a);
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
      setError(L('المتصفح لا يدعم تحديد الموقع الجغرافي.', 'Your browser does not support geolocation.'));
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
        setError(L('تعذّر الوصول لموقعك الحالي. تأكد من السماح بإذن الموقع.', 'Could not get your location. Please allow location access.'));
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
        setError(L('لم يتم العثور على هذه المدينة، يرجى النقر يدوياً على الخريطة.', 'City not found. Please tap the map to set the location manually.'));
      }
    } catch {
      setError(L('حدث خطأ أثناء البحث عن المدينة.', 'Something went wrong while searching for the city.'));
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
      if (!res.ok) throw new Error(data.error || L('فشل في استخراج الموقع من الرابط', 'Could not extract the location from the link'));
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
        <label className="block text-sm font-medium text-slate-700 mb-1">{L('المدينة', 'City')}</label>
        <div className="flex gap-2">
          <input value={city} onChange={(e) => onCityChange(e.target.value)} className="w-full px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400" placeholder={L('مثال: المنامة، المحرق، دبي', 'e.g. Manama, Muharraq, Dubai')} />
          <button type="button" onClick={handleSearchCity} disabled={searching} className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm whitespace-nowrap disabled:opacity-50">
            {searching ? L('جاري البحث...', 'Searching...') : L('بحث بالمدينة', 'Search city')}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">🔗 {L('رابط موقع الصالون (Google Maps Link)', 'Salon location link (Google Maps link)')}</label>
        <div className="flex gap-2" dir="ltr">
          <button type="button" onClick={handleParseMapUrl} disabled={parsingUrl} className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm whitespace-nowrap disabled:opacity-50 order-2">
            {parsingUrl ? L('جاري التحليل...', 'Analyzing...') : L('استخراج الإحداثيات', 'Extract coordinates')}
          </button>
          <input type="url" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} className="w-full px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 order-1 text-left" placeholder="https://maps.app.goo.gl/..." />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleUseMyLocation} disabled={locating} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm whitespace-nowrap disabled:opacity-50">
          📍 {locating ? L('جاري التحديد...', 'Locating...') : L('استخدم موقعي الحالي', 'Use my current location')}
        </button>
        <button type="button" onClick={handleClear} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-sm whitespace-nowrap">
          مسح التحديد
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">📍 {L('الخريطة التفاعلية (اسحب العلامة أو انقر لتحديد الموقع بدقة)', 'Interactive map (drag the marker or tap to set the exact location)')}</label>
        <div id={mapId.current} className="w-full h-[300px] rounded-lg border border-slate-300 z-0" />
      </div>

      <div className="grid grid-cols-2 gap-2" dir="ltr">
        <input
          type="number"
          step="any"
          value={lat}
          onChange={(e) => onLatChange(e.target.value ? parseFloat(e.target.value) : '')}
          className="px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 bg-slate-50"
          placeholder="Lat"
        />
        <input
          type="number"
          step="any"
          value={lng}
          onChange={(e) => onLngChange(e.target.value ? parseFloat(e.target.value) : '')}
          className="px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 bg-slate-50"
          placeholder="Lng"
        />
      </div>
    </div>
  );
}

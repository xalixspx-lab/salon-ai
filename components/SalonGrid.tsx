'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { googleMapsUrl } from '@/lib/geo';

export interface SalonGridItem {
  id: string;
  name: string;
  city: string | null;
  addressText?: string | null;
  currency?: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  hasActiveOffer?: boolean;
  isFeatured?: boolean;
  logoUrl?: string | null;
  rating?: number | null;
  reviewCount?: number;
  distanceKm?: number | string | null;
}

export default function SalonGrid({ locale, salons }: { locale: string; salons: SalonGridItem[] }) {
  const t = useTranslations('Discovery');
  const [query, setQuery] = useState('');
  const [nearMeResults, setNearMeResults] = useState<SalonGridItem[] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const source = nearMeResults ?? salons;

  const filtered = useMemo(() => {
    if (!query.trim()) return source;
    const q = query.trim().toLowerCase();
    return source.filter((s) => s.name.toLowerCase().includes(q));
  }, [source, query]);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setLocationError(t('locationError'));
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/salons?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&radius=50`
          );
          const data = await res.json();
          if (data.success) setNearMeResults(data.data);
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocationError(t('locationError'));
        setLocating(false);
      }
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-black text-black"
        />
        {nearMeResults ? (
          <button
            onClick={() => setNearMeResults(null)}
            className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition whitespace-nowrap"
          >
            ✕ {t('clearNearMe')}
          </button>
        ) : (
          <button
            onClick={handleNearMe}
            disabled={locating}
            className="px-4 py-2.5 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 whitespace-nowrap"
          >
            📍 {locating ? t('locating') : t('nearMe')}
          </button>
        )}
      </div>

      {locationError && <p className="text-sm text-red-600 mb-4">{locationError}</p>}

      {filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
          <p className="text-gray-500">{t('noResults')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((salon) => {
            const lat = salon.latitude !== null ? Number(salon.latitude) : null;
            const lng = salon.longitude !== null ? Number(salon.longitude) : null;
            const distance = salon.distanceKm !== undefined && salon.distanceKm !== null ? Number(salon.distanceKm) : null;

            return (
              <div
                key={salon.id}
                className={`bg-white rounded-2xl shadow-md p-6 border hover:shadow-lg transition-shadow ${
                  salon.isFeatured ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {salon.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={salon.logoUrl} alt={salon.name} className="h-11 w-11 shrink-0 rounded-xl object-cover border border-gray-100" />
                    )}
                    <h3 className="text-xl font-bold text-gray-900 truncate">{salon.name}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {salon.isFeatured && (
                      <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                        ⭐ {t('featured')}
                      </span>
                    )}
                    {salon.hasActiveOffer && (
                      <span className="text-xs font-medium bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full">
                        🏷️ {t('hasOffer')}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-1">
                  {salon.addressText || salon.city || (locale === 'ar' ? 'موقع مميز في دول الخليج' : 'Prime GCC Location')}
                </p>
                {salon.rating ? (
                  <p className="text-xs text-amber-600 mb-1">
                    ★ {salon.rating} <span className="text-gray-400">({salon.reviewCount})</span>
                  </p>
                ) : null}
                {distance !== null && (
                  <p className="text-xs text-gray-400 mb-3">
                    📍 {distance.toFixed(1)} {t('distanceKm')}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 gap-2">
                  <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    {salon.currency || 'BHD'}
                  </span>
                  <div className="flex items-center gap-2">
                    {lat !== null && lng !== null && (
                      <a
                        href={googleMapsUrl(lat, lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                        title={t('openInGoogleMaps')}
                      >
                        🗺️
                      </a>
                    )}
                    <Link
                      href={`/${locale}/salons/${salon.id}`}
                      className="bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                      {locale === 'ar' ? 'احجز الآن' : 'Book Now'}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, MapPin, Navigation, Search, Star, Tag, X } from 'lucide-react';
import { googleMapsUrl } from '@/lib/geo';
import Badge from '@/components/ui/Badge';
import Segmented from '@/components/ui/Segmented';
import EmptyState from '@/components/ui/EmptyState';
import { buttonClass } from '@/components/ui/Button';

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

export default function SalonGrid({ locale, salons, initialQuery = '' }: { locale: string; salons: SalonGridItem[]; initialQuery?: string }) {
  const t = useTranslations('Discovery');
  const ar = locale === 'ar';
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<'default' | 'rating' | 'name'>('default');
  const [nearMeResults, setNearMeResults] = useState<SalonGridItem[] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const source = nearMeResults ?? salons;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? source.filter((s) => s.name.toLowerCase().includes(q) || (s.city ?? '').toLowerCase().includes(q)) : source;
    if (sort === 'rating') return [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sort === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [source, query, sort]);

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
          const res = await fetch(`/api/salons?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&radius=50`);
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
      <div className="flex flex-col lg:flex-row gap-3 mb-6 lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-stone-400" strokeWidth={1.8} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full h-12 ps-11 pe-4 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400"
          />
        </div>
        <Segmented
          label={ar ? 'الترتيب' : 'Sort'}
          value={sort}
          onChange={setSort}
          options={[
            { value: 'default', label: ar ? 'الافتراضي' : 'Default' },
            { value: 'rating', label: ar ? 'الأعلى تقييمًا' : 'Top rated' },
            { value: 'name', label: ar ? 'الاسم' : 'Name' },
          ]}
        />
        {nearMeResults ? (
          <button onClick={() => setNearMeResults(null)} className={buttonClass('secondary', 'md', 'whitespace-nowrap')}>
            <X className="h-4 w-4" /> {t('clearNearMe')}
          </button>
        ) : (
          <button onClick={handleNearMe} disabled={locating} className={buttonClass('dark', 'md', 'whitespace-nowrap')}>
            <Navigation className="h-4 w-4" /> {locating ? t('locating') : t('nearMe')}
          </button>
        )}
      </div>

      {locationError && <p className="text-sm text-red-600 mb-4">{locationError}</p>}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white">
          <EmptyState icon={<Search className="h-6 w-6" />} title={t('noResults')} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((salon) => {
            const lat = salon.latitude !== null ? Number(salon.latitude) : null;
            const lng = salon.longitude !== null ? Number(salon.longitude) : null;
            const distance = salon.distanceKm !== undefined && salon.distanceKm !== null ? Number(salon.distanceKm) : null;

            return (
              <article
                key={salon.id}
                className={`group relative flex flex-col rounded-2xl bg-white border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(74,23,48,0.18)] ${
                  salon.isFeatured ? 'border-brand-300 ring-1 ring-brand-100' : 'border-stone-200/80'
                }`}
              >
                <Link href={`/${locale}/salons/${salon.id}`} className="absolute inset-0 z-10 rounded-2xl" aria-label={salon.name} />
                <div className="p-5 flex-1">
                  <div className="flex items-start gap-3.5">
                    {salon.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={salon.logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover border border-stone-100" />
                    ) : (
                      <span className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 text-xl font-semibold flex items-center justify-center">
                        {salon.name.charAt(0)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[17px] font-semibold text-stone-900 truncate">{salon.name}</h3>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-stone-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                        <span className="truncate">{salon.addressText || salon.city || (ar ? 'موقع مميز في دول الخليج' : 'Prime GCC Location')}</span>
                      </p>
                    </div>
                    {salon.rating ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-50 text-amber-700 px-2 py-1 text-sm font-semibold">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {salon.rating}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {salon.isFeatured && <Badge tone="brand">{t('featured')}</Badge>}
                    {salon.hasActiveOffer && (
                      <Badge tone="red">
                        <Tag className="h-3 w-3" /> {t('hasOffer')}
                      </Badge>
                    )}
                    {salon.reviewCount ? (
                      <Badge tone="gray">
                        {salon.reviewCount} {ar ? 'تقييم' : 'reviews'}
                      </Badge>
                    ) : null}
                    {distance !== null && (
                      <Badge tone="blue">
                        {distance.toFixed(1)} {t('distanceKm')}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-stone-100">
                  <span className="text-xs font-medium text-stone-500">{salon.currency || 'BHD'}</span>
                  <div className="flex items-center gap-2">
                    {lat !== null && lng !== null && (
                      <a
                        href={googleMapsUrl(lat, lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative z-20 h-9 w-9 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-800 flex items-center justify-center"
                        title={t('openInGoogleMaps')}
                        aria-label={t('openInGoogleMaps')}
                      >
                        <MapPin className="h-4 w-4" strokeWidth={1.8} />
                      </a>
                    )}
                    <span className={buttonClass('primary', 'sm')}>
                      {ar ? 'تواصل واتساب' : 'WhatsApp'} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { SalonGridItem } from '@/components/SalonGrid';

// شريط أفقي للصالونات المميزة (يختارها الأدمن يدويًا)
export default function FeaturedSalonsStrip({ locale, salons }: { locale: string; salons: SalonGridItem[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x">
      {salons.map((salon) => (
        <Link
          key={salon.id}
          href={`/${locale}/salons/${salon.id}`}
          className="snap-start shrink-0 w-72 bg-white rounded-2xl border border-brand-200 ring-1 ring-brand-100 p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(74,23,48,0.18)]"
        >
          <div className="flex items-center gap-3">
            {salon.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={salon.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover border border-stone-100" />
            ) : (
              <span className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 text-lg font-semibold flex items-center justify-center">{salon.name.charAt(0)}</span>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-stone-900 truncate">{salon.name}</h3>
              <p className="flex items-center gap-1 text-xs text-stone-500">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{salon.addressText || salon.city || (locale === 'ar' ? 'موقع مميز في دول الخليج' : 'Prime GCC Location')}</span>
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

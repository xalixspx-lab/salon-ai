import Link from 'next/link';
import type { SalonGridItem } from '@/components/SalonGrid';

// شريط أفقي بسيط للصالونات المميزة (يختارها الأدمن يدويًا) — بدون شريط بحث
// مكرر، فقط عرض ترويجي أعلى الصفحة الرئيسية.
export default function FeaturedSalonsStrip({ locale, salons }: { locale: string; salons: SalonGridItem[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
      {salons.map((salon) => (
        <Link
          key={salon.id}
          href={`/${locale}/salons/${salon.id}`}
          className="shrink-0 w-64 bg-white rounded-2xl shadow-md p-5 border border-amber-300 ring-1 ring-amber-200 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            {salon.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={salon.logoUrl} alt={salon.name} className="h-10 w-10 shrink-0 rounded-xl object-cover border border-gray-100" />
            )}
            <h3 className="text-base font-bold text-gray-900 truncate">{salon.name}</h3>
          </div>
          <p className="text-xs text-gray-500 truncate">
            {salon.addressText || salon.city || (locale === 'ar' ? 'موقع مميز في دول الخليج' : 'Prime GCC Location')}
          </p>
          {salon.rating ? (
            <p className="text-xs text-amber-600 mt-1">
              ★ {salon.rating} <span className="text-gray-400">({salon.reviewCount})</span>
            </p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

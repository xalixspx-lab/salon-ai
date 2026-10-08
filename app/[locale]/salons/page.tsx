import { prisma } from '@/lib/prisma';
import { getRatings } from '@/lib/ratings';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import SalonMap from '@/components/SalonMap';
import SalonGrid from '@/components/SalonGrid';
import PublicHeader from '@/components/PublicHeader';
import { buttonClass } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { PUBLIC_TENANT } from '@/lib/visibility';

export default async function SalonsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ city?: string; q?: string }>;
}) {
  const { locale } = await params;
  const { city: selectedCity, q: initialQuery } = await searchParams;
  const t = await getTranslations('Discovery');

  // جلب الصالونات (المستأجرين) المنشورة فقط، مع تطبيق الفلتر إذا تم تحديد المدينة
  const tenants = await prisma.tenant.findMany({
    where: { ...PUBLIC_TENANT, ...(selectedCity ? { city: selectedCity } : {}) },
    orderBy: { createdAt: 'desc' },
  });

  // جلب المدن الفريدة لتعبئة أزرار الفلترة (من الصالونات المنشورة فقط)
  const allTenants = await prisma.tenant.findMany({ where: { ...PUBLIC_TENANT }, select: { city: true } });
  const cities = Array.from(new Set(allTenants.map((t) => t.city).filter(Boolean))) as string[];

  // تحديد الصالونات التي لديها عرض نشط حاليًا
  const activeOfferTenantIds = new Set(
    (
      await prisma.offer.findMany({
        where: {
          tenantId: { in: tenants.map((t) => t.id) },
          isActive: true,
          OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
        },
        select: { tenantId: true },
        distinct: ['tenantId'],
      })
    ).map((o) => o.tenantId)
  );

  const ratings = await getRatings(tenants.map((t) => t.id));

  // تحويل الصالونات لشكل قابل للتسلسل لتمريرها لمكوّنات العميل
  const mapSalons = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    city: t.city,
    lat: t.latitude ? Number(t.latitude) : null,
    lng: t.longitude ? Number(t.longitude) : null,
  }));

  const gridSalons = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    city: t.city,
    addressText: t.addressText,
    currency: t.currency,
    latitude: t.latitude ? Number(t.latitude) : null,
    longitude: t.longitude ? Number(t.longitude) : null,
    hasActiveOffer: activeOfferTenantIds.has(t.id),
    logoUrl: t.logoUrl,
    rating: ratings.get(t.id)?.avg ?? null,
    reviewCount: ratings.get(t.id)?.count ?? 0,
  }));

  return (
    <>
      <PublicHeader locale={locale} />
      <main dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div className="bg-[#fcf8f9] border-b border-stone-200/70 px-4 sm:px-6 pt-12 pb-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 mb-2">{t('pageTitle')}</h1>
                <p className="text-stone-600">{t('pageSubtitle')}</p>
              </div>
              <Link href={`/${locale}/salons/new`} className={buttonClass('secondary', 'md', 'shrink-0')}>
                <Plus className="h-4 w-4" /> {t('addSalonButton')}
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-16">
          {/* أزرار الفلترة حسب المدينة */}
          <div className="mb-6 flex gap-2 items-center flex-wrap">
            <span className="text-sm font-medium text-stone-500">{t('filterByCity')}</span>
            <Link
              href={`/${locale}/salons`}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
                !selectedCity ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('allCities')}
            </Link>
            {cities.map((city) => (
              <Link
                key={city}
                href={`/${locale}/salons?city=${encodeURIComponent(city)}`}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedCity === city ? 'bg-brand-600 text-white shadow-sm' : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
              >
                {city}
              </Link>
            ))}
          </div>

          {/* عرض الخريطة التفاعلية */}
          <div className="mb-8 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-3 px-2 pt-2 text-gray-700">{t('mapSectionTitle')}</h2>
            <SalonMap salons={mapSalons} />
          </div>

          {/* قائمة البطاقات مع البحث والأقرب لي */}
          {tenants.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-500">{t('emptyState')}</p>
            </div>
          ) : (
            <SalonGrid locale={locale} salons={gridSalons} initialQuery={initialQuery ?? ''} />
          )}
        </div>
      </main>
    </>
  );
}

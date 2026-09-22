import { prisma } from '@/lib/prisma';
import { getRatings } from '@/lib/ratings';
import Link from 'next/link';
import SalonMap from '@/components/SalonMap';
import SalonGrid from '@/components/SalonGrid';
import PublicHeader from '@/components/PublicHeader';

export default async function SalonsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ city?: string }>;
}) {
  const { locale } = await params;
  const { city: selectedCity } = await searchParams;

  // جلب الصالونات (المستأجرين) المنشورة فقط، مع تطبيق الفلتر إذا تم تحديد المدينة
  const tenants = await prisma.tenant.findMany({
    where: { isPublished: true, ...(selectedCity ? { city: selectedCity } : {}) },
    orderBy: { createdAt: 'desc' },
  });

  // جلب المدن الفريدة لتعبئة أزرار الفلترة (من الصالونات المنشورة فقط)
  const allTenants = await prisma.tenant.findMany({ where: { isPublished: true }, select: { city: true } });
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
      <div className="max-w-4xl mx-auto mt-10 p-6 text-black">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">خريطة وقائمة الصالونات (Salon AI)</h1>
        <Link
          href={`/${locale}/salons/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          + إضافة صالون جديد
        </Link>
      </div>

      {/* أزرار الفلترة حسب المدينة */}
      <div className="mb-6 flex gap-2 items-center flex-wrap">
        <span className="text-sm font-semibold text-gray-600">فلترة حسب المدينة:</span>
        <Link
          href={`/${locale}/salons`}
          className={`px-3 py-1 rounded-full text-sm transition ${
            !selectedCity ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          الكل
        </Link>
        {cities.map((city) => (
          <Link
            key={city}
            href={`/${locale}/salons?city=${encodeURIComponent(city)}`}
            className={`px-3 py-1 rounded-full text-sm transition ${
              selectedCity === city ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {city}
          </Link>
        ))}
      </div>

      {/* عرض الخريطة التفاعلية */}
      <div className="mb-8 bg-white p-2 rounded-lg shadow border border-gray-100">
        <h2 className="text-lg font-semibold mb-3 px-2 text-gray-700">📍 الخريطة التفاعلية للصالونات</h2>
        <SalonMap salons={mapSalons} />
      </div>

      {/* قائمة البطاقات مع البحث والأقرب لي */}
      {tenants.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500 mb-2">لا توجد صالونات مطابقة للبحث أو مضافة حتى الآن.</p>
        </div>
      ) : (
        <SalonGrid locale={locale} salons={gridSalons} />
      )}
      </div>
    </>
  );
}

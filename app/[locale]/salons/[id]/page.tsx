import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import SalonMap from '@/components/SalonMap';
import ServicesList from '@/components/ServicesList';
import { DIRECT_OFFER_TYPES, describeOffer } from '@/lib/offers';
import { getRatings } from '@/lib/ratings';
import FavoriteButton from '@/components/FavoriteButton';
import PublicHeader from '@/components/PublicHeader';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { name: true, city: true, description: true, isPublished: true },
  });
  if (!tenant || !tenant.isPublished) return {};

  const desc = (tenant.description as Record<string, string> | null) || {};
  const text =
    desc[locale] ||
    desc.ar ||
    desc.en ||
    (locale === 'ar'
      ? `احجز موعدك في ${tenant.name}${tenant.city ? ` — ${tenant.city}` : ''}`
      : `Book an appointment at ${tenant.name}${tenant.city ? ` — ${tenant.city}` : ''}`);

  return {
    title: tenant.name,
    description: text.slice(0, 160),
    alternates: { languages: { ar: `/ar/salons/${id}`, en: `/en/salons/${id}` } },
    // og:image تأتي تلقائيًا من opengraph-image.tsx بجانب هذا الملف (صورة
    // حقيقية إن وُجدت، وإلا بطاقة مصمَّمة باسم الصالون) — لا حاجة لتكرارها هنا
    openGraph: { title: tenant.name, description: text.slice(0, 160), type: 'website' },
    twitter: { card: 'summary_large_image', title: tenant.name, description: text.slice(0, 160) },
  };
}

export default async function SalonDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant || !tenant.isPublished) notFound();

  const photos = await prisma.salonPhoto.findMany({ where: { tenantId: tenant.id }, orderBy: { sortOrder: 'asc' } });

  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  });

  const offers = await prisma.offer.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
    },
    include: { appliesToService: true, freeService: true },
    orderBy: { createdAt: 'desc' },
  });

  const t = await getTranslations('SalonDetail');

  const [ratingMap, reviews] = await Promise.all([
    getRatings([tenant.id]),
    prisma.review.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { account: { select: { name: true } } },
    }),
  ]);
  const rating = ratingMap.get(tenant.id);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://salon-ai.co').replace(/\/$/, '');
  const salonImage = tenant.logoUrl || photos[0]?.url || null;
  const prices = services.map((s) => (s.basePrice ? Number(s.basePrice) : null)).filter((p): p is number => p !== null);
  const priceRange = prices.length > 0 ? `${Math.min(...prices)}-${Math.max(...prices)} ${tenant.currency || 'BHD'}` : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: tenant.name,
    url: `${siteUrl}/${locale}/salons/${tenant.id}`,
    ...(salonImage ? { image: salonImage } : {}),
    ...(priceRange ? { priceRange } : {}),
    ...(tenant.phone ? { telephone: tenant.phone } : {}),
    address: { '@type': 'PostalAddress', addressLocality: tenant.city ?? undefined, streetAddress: tenant.addressText ?? undefined },
    ...(tenant.latitude && tenant.longitude
      ? { geo: { '@type': 'GeoCoordinates', latitude: Number(tenant.latitude), longitude: Number(tenant.longitude) } }
      : {}),
    ...(rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: rating.avg, reviewCount: rating.count } } : {}),
  };

  const serviceRows = services.map((s) => {
    const name = (s.name as Record<string, string> | null) || {};
    return {
      id: s.id,
      displayName: name[locale] || name.ar || name.en || '—',
      basePrice: s.basePrice ? Number(s.basePrice) : null,
      baseDurationMinutes: s.baseDurationMinutes,
    };
  });

  const mapSalons = [
    {
      id: tenant.id,
      name: tenant.name,
      city: tenant.city,
      lat: tenant.latitude ? Number(tenant.latitude) : null,
      lng: tenant.longitude ? Number(tenant.longitude) : null,
    },
  ];

  return (
    <>
      <PublicHeader locale={locale} />
      <main className="min-h-screen bg-gray-50" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <div className="bg-gradient-to-b from-violet-50 via-white to-white px-4 sm:px-6 pt-10 pb-8">
        <div className="max-w-3xl mx-auto">
          <header>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                {tenant.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tenant.logoUrl} alt={tenant.name} className="h-16 w-16 rounded-2xl object-cover border border-gray-100 shadow-sm" />
                )}
                <h1 className="text-3xl font-extrabold text-gray-900">{tenant.name}</h1>
              </div>
              <FavoriteButton tenantId={tenant.id} />
            </div>
            {rating && (
              <p className="text-amber-600 text-sm mb-1">
                ★ {rating.avg} <span className="text-gray-400">({rating.count})</span>
              </p>
            )}
            <p className="text-gray-600">
              {tenant.addressText || tenant.city || (locale === 'ar' ? 'موقع مميز في دول الخليج' : 'Prime GCC Location')}
            </p>
            {tenant.phone && (
              <p className="text-gray-500 text-sm mt-1" dir="ltr">
                📞 {tenant.phone}
              </p>
            )}
            {(() => {
              const description = (tenant.description as Record<string, string> | null) || {};
              const text = description[locale] || description.ar || description.en;
              return text ? <p className="text-gray-700 mt-4 leading-relaxed">{text}</p> : null;
            })()}
          </header>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 -mt-2">

        {offers.length > 0 && (
          <div className="mb-8 space-y-2">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4"
              >
                <span className="text-lg">🔔</span>
                <div>
                  <p className="font-semibold text-rose-900">{tenant.name}</p>
                  <p className="text-sm text-rose-700 mt-0.5">
                    {describeOffer(offer as any, locale, tenant.currency || 'BHD')}
                    {offer.appliesToService && (
                      <>
                        {' — '}
                        {(() => {
                          const name = (offer.appliesToService!.name as Record<string, string> | null) || {};
                          return name[locale] || name.ar || name.en || '';
                        })()}
                      </>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {(tenant.latitude && tenant.longitude) && (
          <div className="mb-8 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
            <SalonMap salons={mapSalons} />
          </div>
        )}

        {photos.length > 0 && (
          <section className="mb-8">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.url} alt={tenant.name} className="aspect-square w-full object-cover rounded-xl border border-gray-100" />
              ))}
            </div>
          </section>
        )}

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('services')}</h2>
          <ServicesList
            tenantId={tenant.id}
            services={serviceRows}
            currency={tenant.currency || 'BHD'}
            depositPercentage={tenant.depositPercentage}
            cancellationHours={tenant.cancellationHours}
            refundPercentAfterDeadline={tenant.refundPercentAfterDeadline}
            offers={offers
              .filter((o) => DIRECT_OFFER_TYPES.includes(o.type))
              .map((o) => ({
                id: o.id,
                type: o.type,
                discountPercent: o.discountPercent,
                discountAmount: o.discountAmount ? Number(o.discountAmount) : null,
                appliesToServiceId: o.appliesToServiceId,
                freeServiceId: o.freeServiceId,
              }))}
          />
        </section>

        <section className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('reviews')}</h2>
          {reviews.length === 0 ? (
            <p className="text-gray-400 text-sm">{t('noReviews')}</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{r.account.name}</span>
                    <span className="text-amber-500" dir="ltr">
                      {'★'.repeat(r.rating)}
                      <span className="text-gray-300">{'★'.repeat(5 - r.rating)}</span>
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      </main>
    </>
  );
}

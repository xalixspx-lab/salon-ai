import type { Metadata } from 'next';
import { MapPin, MessageCircle, Phone, Tag } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import SalonMap from '@/components/SalonMap';
import ServicesList from '@/components/ServicesList';
import { DIRECT_OFFER_TYPES, describeOffer } from '@/lib/offers';
import PublicHeader from '@/components/PublicHeader';
import { getSalonWhatsappNumber, waMeLink } from '@/lib/salonWhatsapp';
import { isPubliclyVisible } from '@/lib/visibility';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return {};
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { name: true, city: true, description: true, isPublished: true, adminHiddenAt: true },
  });
  if (!tenant || !isPubliclyVisible(tenant)) return {};

  const desc = (tenant.description as Record<string, string> | null) || {};
  const text =
    desc[locale] ||
    desc.ar ||
    desc.en ||
    (locale === 'ar'
      ? `تواصل مع ${tenant.name}${tenant.city ? ` — ${tenant.city}` : ''} عبر واتساب`
      : `Contact ${tenant.name}${tenant.city ? ` — ${tenant.city}` : ''} on WhatsApp`);

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
  // معرّف غير UUID كان يرمي خطأ Prisma (500) بدل 404
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant || !isPubliclyVisible(tenant)) notFound();

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
  const waNumber = await getSalonWhatsappNumber(tenant.id, tenant.phone);
  const waText = locale === 'ar' ? `مرحبًا ${tenant.name}، أود الاستفسار عن خدماتكم` : `Hello ${tenant.name}, I would like to ask about your services`;
  const waHref = waNumber ? waMeLink(waNumber, waText) : null;


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

  const ar = locale === 'ar';
  const description = (tenant.description as Record<string, string> | null) || {};
  const aboutText = description[locale] || description.ar || description.en;

  return (
    <>
      <PublicHeader locale={locale} />
      <main className="min-h-screen bg-[#f8f6f7]" dir={ar ? 'rtl' : 'ltr'}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

        <div className="relative bg-[#fcf8f9] border-b border-stone-200/70">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_90%_0%,rgba(180,69,107,0.12),transparent)]" />
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-8">
            <div className="flex items-start gap-4">
              {tenant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logoUrl} alt={tenant.name} className="h-20 w-20 rounded-3xl object-cover border border-white shadow-md" />
              ) : (
                <span className="h-20 w-20 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 text-white text-3xl font-semibold flex items-center justify-center shadow-md">{tenant.name.charAt(0)}</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">{tenant.name}</h1>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-stone-600">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-stone-400" strokeWidth={1.8} />
                    {tenant.addressText || tenant.city || (ar ? 'موقع مميز في دول الخليج' : 'Prime GCC Location')}
                  </span>
                  {tenant.phone && (
                    <a href={`tel:${tenant.phone}`} className="inline-flex items-center gap-1.5 hover:text-brand-700" dir="ltr">
                      <Phone className="h-4 w-4 text-stone-400" strokeWidth={1.8} /> {tenant.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
            {aboutText && <p className="text-stone-700 mt-5 leading-relaxed max-w-2xl">{aboutText}</p>}
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 font-semibold text-white shadow-sm shadow-emerald-600/20 transition-colors hover:bg-[#1ebe5a]">
                <MessageCircle className="h-5 w-5" /> {ar ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}
              </a>
            )}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-8 space-y-6">
          {offers.length > 0 && (
            <div className="space-y-2">
              {offers.map((offer) => (
                <div key={offer.id} className="flex items-start gap-3 bg-brand-50 border border-brand-100 rounded-2xl p-4">
                  <span className="h-9 w-9 shrink-0 rounded-xl bg-white text-brand-600 flex items-center justify-center shadow-sm">
                    <Tag className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="font-semibold text-brand-900">{tenant.name}</p>
                    <p className="text-sm text-brand-800/80 mt-0.5">
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

          <section className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">{t('services')}</h2>
            <ServicesList services={serviceRows} currency={tenant.currency || 'BHD'} emptyText={t('noServices')} minutesLabel={t('durationLabel')} />
          </section>

          {photos.length > 0 && (
            <section className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-4">{ar ? 'معرض الصور' : 'Gallery'}</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={p.url} alt={tenant.name} className="aspect-square w-full object-cover rounded-xl border border-stone-100" />
                ))}
              </div>
            </section>
          )}

          {tenant.latitude && tenant.longitude && (
            <div className="bg-white p-2 rounded-2xl border border-stone-200/80">
              <SalonMap salons={mapSalons} />
            </div>
          )}

        </div>
        {waHref && (
          <div className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] font-semibold text-white">
              <MessageCircle className="h-5 w-5" /> {ar ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}
            </a>
          </div>
        )}
      </main>
    </>
  );
}

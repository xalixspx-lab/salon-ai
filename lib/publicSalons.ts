import { prisma } from '@/lib/prisma';
import { getRatings } from '@/lib/ratings';

// قائمة الصالونات المنشورة بحقول عامة فقط (لا باقة ولا إعدادات داخلية). تستخدمها
// الصفحة الرئيسية مباشرة بدل استدعاء الـ API الخاص بها عبر HTTP.
export async function listPublicSalons(opts: { city?: string | null; take?: number; featuredOnly?: boolean } = {}) {
  const tenants = await prisma.tenant.findMany({
    where: { isPublished: true, ...(opts.city ? { city: opts.city } : {}), ...(opts.featuredOnly ? { isFeatured: true } : {}) },
    take: opts.take ?? 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      city: true,
      subdomain: true,
      customDomain: true,
      logoUrl: true,
      latitude: true,
      longitude: true,
      addressText: true,
      timezone: true,
      currency: true,
      isFeatured: true,
    },
  });

  const ids = tenants.map((t) => t.id);
  const [offers, ratings] = await Promise.all([
    prisma.offer.findMany({
      where: { tenantId: { in: ids }, isActive: true, OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
      select: { tenantId: true },
      distinct: ['tenantId'],
    }),
    getRatings(ids),
  ]);
  const withOffer = new Set(offers.map((o) => o.tenantId));

  return tenants.map((t) => ({
    ...t,
    latitude: t.latitude ? Number(t.latitude) : null,
    longitude: t.longitude ? Number(t.longitude) : null,
    hasActiveOffer: withOffer.has(t.id),
    rating: ratings.get(t.id)?.avg ?? null,
    reviewCount: ratings.get(t.id)?.count ?? 0,
  }));
}

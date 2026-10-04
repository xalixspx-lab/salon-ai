import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { PUBLIC_TENANT } from '@/lib/visibility';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const locales = ['ar', 'en'];

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenants = await prisma.tenant.findMany({
    where: { ...PUBLIC_TENANT },
    select: { id: true, updatedAt: true },
  });

  const alternates = (path: string) => ({
    languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}${path}`])),
  });

  const staticPaths = ['', '/salons'];
  return [
    ...staticPaths.flatMap((path) =>
      locales.map((l) => ({
        url: `${siteUrl}/${l}${path}`,
        changeFrequency: 'daily' as const,
        priority: path === '' ? 1 : 0.8,
        alternates: alternates(path),
      }))
    ),
    ...tenants.flatMap((t) =>
      locales.map((l) => ({
        url: `${siteUrl}/${l}/salons/${t.id}`,
        lastModified: t.updatedAt ?? undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        alternates: alternates(`/salons/${t.id}`),
      }))
    ),
  ];
}

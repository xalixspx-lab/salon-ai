import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { DEFAULT_TIMEZONE } from '@/lib/schedule';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  // tenantId من الجلسة دائمًا: لا يمكن فتح عميل صالون آخر
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      account: { select: { id: true } },
      appointments: {
        orderBy: { startTime: 'desc' },
        include: { service: { select: { name: true } }, employee: { select: { name: true } } },
      },
    },
  });
  if (!customer) notFound();

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { timezone: true, currency: true },
  });
  const tz = tenant?.timezone || DEFAULT_TIMEZONE;
  const currency = tenant?.currency || 'BHD';
  const t = await getTranslations('ClientDetail');
  const dash = await getTranslations('Dashboard');
  const loc = locale === 'ar' ? 'ar-BH' : 'en-GB';

  const svcName = (svc: { name: unknown } | null) => {
    const n = (svc?.name as Record<string, string> | null) || {};
    return n[locale] || n.ar || n.en || '—';
  };
  const statusLabel = (s: string | null) =>
    s === 'CONFIRMED' ? dash('confirmed') : s === 'COMPLETED' ? dash('completed') : s === 'CANCELLED' ? dash('cancelled') : dash('pending');

  const valid = customer.appointments.filter((a) => a.status !== 'CANCELLED');
  const cancelled = customer.appointments.length - valid.length;
  const spent = customer.appointments
    .filter((a) => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + (a.totalAmount ? Number(a.totalAmount) : 0), 0);

  const serviceCount = new Map<string, { count: number; name: string }>();
  for (const a of valid) {
    if (!a.serviceId) continue;
    const cur = serviceCount.get(a.serviceId) || { count: 0, name: svcName(a.service) };
    serviceCount.set(a.serviceId, { ...cur, count: cur.count + 1 });
  }
  const favorite = [...serviceCount.values()].sort((a, b) => b.count - a.count)[0];
  const dates = valid.map((a) => a.startTime!).filter(Boolean).sort((a, b) => a.getTime() - b.getTime());
  const fmt = (d?: Date) => (d ? d.toLocaleDateString(loc, { timeZone: tz, dateStyle: 'medium' }) : '—');

  const stats = [
    { label: t('totalVisits'), value: valid.length },
    { label: t('totalSpent'), value: `${spent.toFixed(3)} ${currency}` },
    { label: t('cancellations'), value: cancelled },
    { label: t('favoriteService'), value: favorite?.name || '—' },
    { label: t('firstVisit'), value: fmt(dates[0]) },
    { label: t('lastVisit'), value: fmt(dates[dates.length - 1]) },
  ];

  return (
    <div>
      <Link href={`/${locale}/dashboard/clients`} className="text-sm text-brand-600 hover:underline">
        ← {t('back')}
      </Link>
      <div className="flex flex-wrap items-center gap-3 mt-3 mb-6">
        <h1 className="text-2xl font-bold text-stone-900">{customer.name}</h1>
        {customer.account && (
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
            {t('hasAccount')}
          </span>
        )}
      </div>
      {customer.phone && (
        <p className="text-stone-500 mb-6" dir="ltr">
          📞 {customer.phone}
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <p className="text-sm text-stone-500 mb-1">{s.label}</p>
            <p className="text-xl font-bold text-stone-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-x-auto">
        <h2 className="text-lg font-bold text-stone-900 p-4 pb-0">{t('history')}</h2>
        {customer.appointments.length === 0 ? (
          <p className="p-6 text-center text-stone-400 text-sm">{t('noHistory')}</p>
        ) : (
          <table className="w-full text-right text-sm text-stone-600 mt-2">
            <thead className="bg-stone-50 text-stone-700 text-xs">
              <tr>
                <th className="p-3">{t('date')}</th>
                <th className="p-3">{t('service')}</th>
                <th className="p-3">{t('staff')}</th>
                <th className="p-3">{t('amount')}</th>
                <th className="p-3">{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {customer.appointments.map((a) => (
                <tr key={a.id} className="border-b border-stone-100">
                  <td className="p-3">{a.startTime ? a.startTime.toLocaleString(loc, { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                  <td className="p-3 font-medium text-stone-900">{svcName(a.service)}</td>
                  <td className="p-3">{a.employee?.name || '—'}</td>
                  <td className="p-3">{a.totalAmount ? `${Number(a.totalAmount).toFixed(3)} ${currency}` : '—'}</td>
                  <td className="p-3">{statusLabel(a.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

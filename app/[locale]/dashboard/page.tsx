import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { resolveSubscription } from '@/lib/subscription';
import AnalyticsPanel from '@/components/dashboard/AnalyticsPanel';
import { formatDateTime } from '@/lib/format';
import { DEFAULT_TIMEZONE, localParts, zonedToUtc } from '@/lib/schedule';

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  PENDING_DEPOSIT: 'bg-amber-50 text-amber-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export default async function DashboardOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const t = await getTranslations('Dashboard');
  const common = await getTranslations('Common');

  const tenantInfo = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { timezone: true, currency: true, plan: true, trialEndsAt: true },
  });

  // "اليوم" بتوقيت الصالون: setHours على خادم UTC كان يزيح حدود اليوم 3 ساعات
  // عن البحرين فتُحسب حجوزات الليلة الماضية/القادمة ضمن اليوم خطأً
  const tz = tenantInfo?.timezone || DEFAULT_TIMEZONE;
  const startOfToday = zonedToUtc(localParts(new Date(), tz).dateStr, '00:00', tz);
  const endOfToday = new Date(startOfToday.getTime() + 24 * 3600 * 1000);

  const [todayAppointments, totalCustomers, recentAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId: session.tenantId, startTime: { gte: startOfToday, lt: endOfToday } },
      select: { totalAmount: true },
    }),
    prisma.customer.count({ where: { tenantId: session.tenantId } }),
    prisma.appointment.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { startTime: 'desc' },
      take: 5,
      include: { service: true, customer: true, employee: true },
    }),
  ]);

  const expectedRevenue = todayAppointments.reduce(
    (sum, a) => sum + (a.totalAmount ? Number(a.totalAmount) : 0),
    0
  );

  const statusLabel = (status: string | null) => {
    switch (status) {
      case 'CONFIRMED':
        return t('confirmed');
      case 'COMPLETED':
        return t('completed');
      case 'CANCELLED':
        return t('cancelled');
      default:
        return t('pending');
    }
  };

  const serviceName = (svc: { name: unknown } | null) => {
    if (!svc?.name || typeof svc.name !== 'object') return '—';
    const names = svc.name as Record<string, string>;
    return names[locale] || names.ar || names.en || '—';
  };

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{t('welcome')}</h1>
          <p className="text-sm text-stone-500">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-200">
            {t('statusOpen')}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-sm font-medium text-stone-500 mb-1">{t('todayBookings')}</p>
          <h3 className="text-3xl font-extrabold text-stone-900">{todayAppointments.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-sm font-medium text-stone-500 mb-1">{t('expectedRevenue')}</p>
          <h3 className="text-3xl font-extrabold text-stone-900">
            {expectedRevenue.toLocaleString()} {common('currency')}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-sm font-medium text-stone-500 mb-1">{t('totalCustomers')}</p>
          <h3 className="text-3xl font-extrabold text-stone-900">{totalCustomers}</h3>
        </div>
      </div>

      {tenantInfo && resolveSubscription(tenantInfo).analytics ? (
      <AnalyticsPanel
        tenantId={session.tenantId}
        timezone={tenantInfo?.timezone ?? null}
        currency={tenantInfo?.currency || 'BHD'}
        locale={locale}
      />
      ) : (
        <div className="mb-8 rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
          {t('analyticsLocked')}{' '}
          <Link href={`/${locale}/dashboard/subscription`} className="font-semibold text-brand-700 underline">
            {t('viewPlans')}
          </Link>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-stone-900 mb-4">{t('recentBookings')}</h3>
        {recentAppointments.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">{t('noBookingsYet')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-stone-600">
              <thead className="bg-stone-50 text-stone-700 uppercase text-xs">
                <tr>
                  <th className="p-3 rounded-s-xl">{t('clientName')}</th>
                  <th className="p-3">{t('service')}</th>
                  <th className="p-3">{t('time')}</th>
                  <th className="p-3">{t('assignedStaff')}</th>
                  <th className="p-3 rounded-e-xl">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {recentAppointments.map((a) => (
                  <tr key={a.id} className="border-b border-stone-100">
                    <td className="p-3 font-medium text-stone-900">{a.customer?.name || '—'}</td>
                    <td className="p-3">{serviceName(a.service)}</td>
                    <td className="p-3">
                      {a.startTime ? formatDateTime(a.startTime, locale, tenantInfo?.timezone) : '—'}
                    </td>
                    <td className="p-3">{a.employee?.name || '—'}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-md font-medium ${STATUS_STYLES[a.status || ''] || 'bg-stone-100 text-stone-600'}`}>
                        {statusLabel(a.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

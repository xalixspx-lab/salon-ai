import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { CalendarDays, Users, Wallet } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { resolveSubscription } from '@/lib/subscription';
import AnalyticsPanel from '@/components/dashboard/AnalyticsPanel';
import { formatDateTime } from '@/lib/format';
import { DEFAULT_TIMEZONE, localParts, zonedToUtc } from '@/lib/schedule';

const STATUS_TONE: Record<string, 'blue' | 'green' | 'amber' | 'red' | 'gray'> = {
  CONFIRMED: 'blue',
  COMPLETED: 'green',
  PENDING_DEPOSIT: 'amber',
  CANCELLED: 'red',
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
      <header className="flex flex-wrap justify-between items-center gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{t('welcome')}</h1>
          <p className="text-sm text-stone-500 mt-0.5">{t('subtitle')}</p>
        </div>
        <Badge tone="green" className="!px-3 !py-1.5 !text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t('statusOpen')}
        </Badge>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5 mb-8">
        <StatCard label={t('todayBookings')} value={todayAppointments.length} icon={<CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.8} />} />
        <StatCard label={t('expectedRevenue')} value={`${expectedRevenue.toLocaleString()} ${common('currency')}`} icon={<Wallet className="h-[18px] w-[18px]" strokeWidth={1.8} />} />
        <StatCard label={t('totalCustomers')} value={totalCustomers} icon={<Users className="h-[18px] w-[18px]" strokeWidth={1.8} />} />
      </div>

      {tenantInfo && resolveSubscription(tenantInfo).analytics ? (
        <AnalyticsPanel tenantId={session.tenantId} timezone={tenantInfo?.timezone ?? null} currency={tenantInfo?.currency || 'BHD'} locale={locale} />
      ) : (
        <div className="mb-8 rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 p-6 text-sm text-stone-700">
          {t('analyticsLocked')}{' '}
          <Link href={`/${locale}/dashboard/subscription`} className="font-semibold text-brand-700 underline">
            {t('viewPlans')}
          </Link>
        </div>
      )}

      <Card>
        <CardHeader title={t('recentBookings')} />
        {recentAppointments.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-6 w-6" strokeWidth={1.8} />} title={t('noBookingsYet')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm text-stone-600">
              <thead className="bg-stone-50/70 text-stone-500 text-xs">
                <tr>
                  <th className="px-5 py-3 text-start font-medium">{t('clientName')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('service')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('time')}</th>
                  <th className="px-3 py-3 text-start font-medium">{t('assignedStaff')}</th>
                  <th className="px-5 py-3 text-start font-medium">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {recentAppointments.map((a) => (
                  <tr key={a.id} className="border-t border-stone-100 hover:bg-stone-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2.5 font-medium text-stone-900">
                        <Avatar name={a.customer?.name || '?'} size={32} />
                        {a.customer?.name || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">{serviceName(a.service)}</td>
                    <td className="px-3 py-3.5 whitespace-nowrap tabular-nums">{a.startTime ? formatDateTime(a.startTime, locale, tenantInfo?.timezone) : '—'}</td>
                    <td className="px-3 py-3.5">{a.employee?.name || '—'}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={STATUS_TONE[a.status || ''] || 'gray'}>{statusLabel(a.status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

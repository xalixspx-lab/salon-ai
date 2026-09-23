import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCustomerSession } from '@/lib/customerSession';
import { prisma } from '@/lib/prisma';
import { describeOffer } from '@/lib/offers';
import VerifyEmailBanner from '@/components/VerifyEmailBanner';
import ReviewForm from '@/components/account/ReviewForm';
import AppointmentActions from '@/components/account/AppointmentActions';
import LogoutButton from '@/components/account/LogoutButton';
import ChangePasswordCard from '@/components/account/ChangePasswordCard';

// نافذة الإلغاء/التعديل: قبل الموعد بعدد الساعات الذي حدده الصالون
function isModifiable(start: Date, cancellationHours: number): boolean {
  return start.getTime() - Date.now() >= cancellationHours * 3600 * 1000;
}

function serviceDisplayName(svc: { name: unknown } | null, locale: string): string {
  if (!svc?.name || typeof svc.name !== 'object') return '—';
  const names = svc.name as Record<string, string>;
  return names[locale] || names.ar || names.en || '—';
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getCustomerSession();
  if (!session) redirect(`/${locale}/account/login`);

  const t = await getTranslations('Account');

  const linkedCustomers = await prisma.customer.findMany({
    where: { accountId: session.accountId },
    select: { id: true, tenantId: true },
  });
  const tenantIds = Array.from(new Set(linkedCustomers.map((c) => c.tenantId)));
  const customerIds = linkedCustomers.map((c) => c.id);

  const favorites = await prisma.favorite.findMany({
    where: { accountId: session.accountId, tenant: { isPublished: true } },
    include: { tenant: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const [appointments, offers, upcoming] = await Promise.all([
    prisma.appointment.findMany({
      where: { customerId: { in: customerIds } },
      orderBy: { startTime: 'desc' },
      include: {
        tenant: { select: { name: true, cancellationHours: true, timezone: true } },
        service: { select: { name: true } },
        appliedOffer: { include: { appliesToService: true, freeService: true } },
        review: { select: { rating: true } },
      },
    }),
    tenantIds.length > 0
      ? prisma.offer.findMany({
          where: {
            tenantId: { in: tenantIds },
            isActive: true,
            OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
          },
          include: { tenant: { select: { name: true } }, appliesToService: true, freeService: true },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    customerIds.length > 0
      ? prisma.appointment.findMany({
          where: {
            customerId: { in: customerIds },
            startTime: { gte: new Date() },
            status: { in: ['CONFIRMED', 'PENDING_DEPOSIT'] },
          },
          include: { tenant: { select: { name: true } } },
          orderBy: { startTime: 'asc' },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto">
        <header className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1">{t('myAccount')}</h1>
            <p className="text-gray-500">{session.name} · <span dir="ltr">{session.email}</span></p>
          </div>
          <LogoutButton />
        </header>

        <VerifyEmailBanner audience="customer" />

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('notifications')}</h2>
          {offers.length === 0 && upcoming.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm text-center text-gray-400">
              {t('noNotifications')}
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((a) => (
                <div key={a.id} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <span className="text-lg">⏰</span>
                  <div>
                    <p className="font-semibold text-amber-900">{a.tenant?.name}</p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      {t('upcomingReminder')} — {a.startTime ? new Date(a.startTime).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US') : ''}
                    </p>
                  </div>
                </div>
              ))}
              {offers.map((offer) => (
                <div key={offer.id} className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <span className="text-lg">🔔</span>
                  <div>
                    <p className="font-semibold text-rose-900">{offer.tenant.name}</p>
                    <p className="text-sm text-rose-700 mt-0.5">
                      {describeOffer(offer as any, locale, 'BHD')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('favorites')}</h2>
          {favorites.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm text-center text-gray-400">{t('noFavorites')}</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {favorites.map((f) => (
                <Link
                  key={f.tenantId}
                  href={`/${locale}/salons/${f.tenantId}`}
                  className="bg-white border border-gray-100 rounded-full px-4 py-2 text-sm text-gray-800 hover:border-gray-300"
                >
                  ♥ {f.tenant.name}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('history')}</h2>
          {appointments.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm text-center text-gray-400">
              {t('noHistory')}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-right text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                  <tr>
                    <th className="p-3">{t('salon')}</th>
                    <th className="p-3">{t('service')}</th>
                    <th className="p-3">{t('date')}</th>
                    <th className="p-3">{t('amountPaid')}</th>
                    <th className="p-3">{t('discount')}</th>
                    <th className="p-3">{t('status')}</th>
                    <th className="p-3">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id} className="border-b border-gray-100">
                      <td className="p-3 font-medium text-gray-900">{a.tenant?.name || '—'}</td>
                      <td className="p-3">{serviceDisplayName(a.service, locale)}</td>
                      <td className="p-3">
                        {a.startTime ? new Date(a.startTime).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US') : '—'}
                      </td>
                      <td className="p-3">{a.totalAmount ? String(a.totalAmount) : '—'}</td>
                      <td className="p-3">
                        {a.appliedOffer ? describeOffer(a.appliedOffer as any, locale, 'BHD') : (
                          <span className="text-gray-400">{t('noDiscount')}</span>
                        )}
                      </td>
                      <td className="p-3">{t(`status_${a.status}` as never)}</td>
                      <td className="p-3">
                        {a.status === 'COMPLETED' &&
                          (a.review ? (
                            <span className="text-amber-500" dir="ltr">{'★'.repeat(a.review.rating)}</span>
                          ) : (
                            <ReviewForm appointmentId={a.id} />
                          ))}
                        {a.tenantId && a.serviceId && a.startTime && ['CONFIRMED', 'PENDING_DEPOSIT'].includes(a.status || '') &&
                          isModifiable(a.startTime, a.tenant?.cancellationHours ?? 24) && (
                            <AppointmentActions
                              appointmentId={a.id}
                              tenantId={a.tenantId}
                              serviceId={a.serviceId}
                              employeeId={a.employeeId}
                              timezone={a.tenant?.timezone || 'Asia/Bahrain'}
                            />
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8">
          <ChangePasswordCard />
        </section>
      </div>
    </main>
  );
}

import { prisma } from '@/lib/prisma';
import { localParts } from '@/lib/schedule';
import { resolveSubscription } from '@/lib/subscription';
import { MAX_ROWS, type AdminReportType, type Kpi, type Lang, type Report, type Row, type Section } from '@/lib/reports/types';

// تقارير المشرف على مستوى المنصة كلها (خارج نطاق مستأجر واحد).
const TZ = 'Asia/Bahrain';
const num = (d: unknown) => (d === null || d === undefined ? 0 : Number(d));
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

export async function buildAdminReport(opts: { type: AdminReportType; from: Date; to: Date; periodLabel: string; lang: Lang }): Promise<Report> {
  const { type, from, to, lang } = opts;
  const t = (a: string, e: string) => (lang === 'en' ? e : a);
  const inRange = { gte: from, lt: to };
  const day = (d: Date) => localParts(d, TZ).dateStr;
  const now = new Date();

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      plan: true,
      trialEndsAt: true,
      isPublished: true,
      adminHiddenAt: true,
      currency: true,
      createdAt: true,
      owner: { select: { email: true } },
      whatsappAccount: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });
  const currencyOf = new Map(tenants.map((x) => [x.id, x.currency || 'BHD']));
  const nameOf = new Map(tenants.map((x) => [x.id, x.name]));
  const visible = (x: { isPublished: boolean; adminHiddenAt: Date | null }) => x.isPublished && !x.adminHiddenAt;

  // حجوزات الفترة (حقول دنيا للتجميع)
  const appts = await prisma.appointment.findMany({
    where: { startTime: inRange },
    select: { tenantId: true, status: true, totalAmount: true, startTime: true },
    take: 100000,
  });
  const bookingsByTenant = new Map<string, { bookings: number; completed: number; cancelled: number; revenue: number }>();
  for (const a of appts) {
    if (!a.tenantId) continue;
    const r = bookingsByTenant.get(a.tenantId) ?? { bookings: 0, completed: 0, cancelled: 0, revenue: 0 };
    r.bookings++;
    if (a.status === 'COMPLETED') {
      r.completed++;
      r.revenue += num(a.totalAmount);
    }
    if (a.status === 'CANCELLED') r.cancelled++;
    bookingsByTenant.set(a.tenantId, r);
  }
  const completed = appts.filter((a) => a.status === 'COMPLETED');
  const revenueByCurrency = new Map<string, number>();
  for (const a of completed) {
    const c = currencyOf.get(a.tenantId ?? '') ?? 'BHD';
    revenueByCurrency.set(c, (revenueByCurrency.get(c) ?? 0) + num(a.totalAmount));
  }
  const bhdRevenue = round3(revenueByCurrency.get('BHD') ?? 0);
  const otherCurrencies = [...revenueByCurrency.keys()].filter((c) => c !== 'BHD');

  const sections: Section[] = [];
  let kpis: Kpi[] = [];
  let title = '';

  const dailySection = (): Section => {
    const byDay = new Map<string, { bookings: number; completed: number; cancelled: number }>();
    for (const a of appts) {
      if (!a.startTime) continue;
      const k = day(a.startTime);
      const r = byDay.get(k) ?? { bookings: 0, completed: 0, cancelled: 0 };
      r.bookings++;
      if (a.status === 'COMPLETED') r.completed++;
      if (a.status === 'CANCELLED') r.cancelled++;
      byDay.set(k, r);
    }
    return {
      id: 'daily',
      title: t('الحجوزات اليومية على المنصة', 'Daily bookings across the platform'),
      columns: [
        { key: 'date', label: t('اليوم', 'Day') },
        { key: 'bookings', label: t('الحجوزات', 'Bookings'), kind: 'int' },
        { key: 'completed', label: t('المكتملة', 'Completed'), kind: 'int' },
        { key: 'cancelled', label: t('الملغاة', 'Cancelled'), kind: 'int' },
      ],
      rows: [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, r]) => ({ date, ...r })),
      chart: { labelKey: 'date', valueKey: 'bookings' },
    };
  };

  const topSalons = (limit: number): Row[] =>
    [...bookingsByTenant.entries()]
      .sort(([, a], [, b]) => b.revenue - a.revenue || b.bookings - a.bookings)
      .slice(0, limit)
      .map(([id, r]) => ({ name: nameOf.get(id) ?? '—', bookings: r.bookings, completed: r.completed, revenue: round3(r.revenue), currency: currencyOf.get(id) ?? 'BHD' }));

  switch (type) {
    case 'overview': {
      title = t('نظرة عامة على المنصة', 'Platform overview');
      const [newTenants, owners, accounts, newAccounts, convs, msgsIn, msgsOut, newContacts] = await Promise.all([
        prisma.tenant.count({ where: { createdAt: inRange } }),
        prisma.owner.count(),
        prisma.customerAccount.count(),
        prisma.customerAccount.count({ where: { createdAt: inRange } }),
        prisma.conversation.count({ where: { lastMessageAt: inRange } }),
        prisma.message.count({ where: { createdAt: inRange, senderRole: 'CUSTOMER' } }),
        prisma.message.count({ where: { createdAt: inRange, senderRole: { in: ['OWNER', 'AGENT'] } } }),
        prisma.contact.count({ where: { createdAt: inRange } }),
      ]);
      kpis = [
        { id: 'salons', label: t('إجمالي الصالونات', 'Total salons'), value: tenants.length, kind: 'int' },
        { id: 'newSalons', label: t('صالونات جديدة', 'New salons'), value: newTenants, kind: 'int' },
        { id: 'visible', label: t('ظاهرة للعامة', 'Publicly visible'), value: tenants.filter(visible).length, kind: 'int' },
        { id: 'hidden', label: t('محظورة إداريًا', 'Hidden by admin'), value: tenants.filter((x) => x.adminHiddenAt).length, kind: 'int' },
        { id: 'owners', label: t('الملاك', 'Owners'), value: owners, kind: 'int' },
        { id: 'accounts', label: t('حسابات العملاء', 'Customer accounts'), value: accounts, kind: 'int', hint: `${t('جديدة', 'new')}: ${newAccounts}` },
        { id: 'bookings', label: t('الحجوزات', 'Bookings'), value: appts.length, kind: 'int' },
        { id: 'revenue', label: t('الإيراد المحقق (دينار بحريني)', 'Realised revenue (BHD)'), value: bhdRevenue, kind: 'money', hint: otherCurrencies.length ? t('عملات أخرى مستبعدة: ', 'Other currencies excluded: ') + otherCurrencies.join(', ') : undefined },
        { id: 'wa', label: t('صالونات واتساب المربوطة', 'WhatsApp-linked salons'), value: tenants.filter((x) => x.whatsappAccount).length, kind: 'int' },
        { id: 'convs', label: t('محادثات نشطة', 'Active conversations'), value: convs, kind: 'int', hint: `${t('واردة', 'in')}: ${msgsIn} / ${t('صادرة', 'out')}: ${msgsOut} / ${t('جهات جديدة', 'new contacts')}: ${newContacts}` },
      ];
      const plans = new Map<string, number>();
      for (const x of tenants) plans.set(x.plan, (plans.get(x.plan) ?? 0) + 1);
      const signups = new Map<string, number>();
      for (const x of tenants) if (x.createdAt && x.createdAt >= from && x.createdAt < to) signups.set(day(x.createdAt), (signups.get(day(x.createdAt)) ?? 0) + 1);
      sections.push(dailySection());
      sections.push({
        id: 'signups',
        title: t('تسجيلات الصالونات حسب اليوم', 'Salon signups per day'),
        columns: [{ key: 'date', label: t('اليوم', 'Day') }, { key: 'count', label: t('الصالونات', 'Salons'), kind: 'int' }],
        rows: [...signups.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, count]) => ({ date, count })),
        chart: { labelKey: 'date', valueKey: 'count' },
      });
      sections.push({
        id: 'plans',
        title: t('توزيع الباقات', 'Plan distribution'),
        columns: [{ key: 'plan', label: t('الباقة', 'Plan') }, { key: 'count', label: t('الصالونات', 'Salons'), kind: 'int' }, { key: 'share', label: t('النسبة', 'Share'), kind: 'percent' }],
        rows: [...plans.entries()].map(([plan, count]) => ({ plan, count, share: pct(count, tenants.length) })),
        chart: { labelKey: 'plan', valueKey: 'count' },
      });
      sections.push({
        id: 'topSalons',
        title: t('أعلى 10 صالونات إيرادًا', 'Top 10 salons by revenue'),
        columns: [
          { key: 'name', label: t('الصالون', 'Salon') },
          { key: 'bookings', label: t('الحجوزات', 'Bookings'), kind: 'int' },
          { key: 'completed', label: t('المكتملة', 'Completed'), kind: 'int' },
          { key: 'revenue', label: t('الإيراد', 'Revenue'), kind: 'int' },
          { key: 'currency', label: t('العملة', 'Currency') },
        ],
        rows: topSalons(10),
      });
      break;
    }

    case 'salons': {
      title = t('تقرير الصالونات', 'Salons report');
      const [msgs, newClients, lastBooking] = await Promise.all([
        prisma.message.groupBy({ by: ['tenantId'], where: { createdAt: inRange }, _count: { _all: true } }),
        prisma.customer.groupBy({ by: ['tenantId'], where: { createdAt: inRange }, _count: { _all: true } }),
        prisma.appointment.groupBy({ by: ['tenantId'], _max: { startTime: true } }),
      ]);
      const msgMap = new Map(msgs.map((m) => [m.tenantId, m._count._all]));
      const clientMap = new Map(newClients.map((m) => [m.tenantId, m._count._all]));
      const lastMap = new Map(lastBooking.map((m) => [m.tenantId, m._max.startTime]));
      const rows: Row[] = tenants.slice(0, MAX_ROWS).map((x) => {
        const b = bookingsByTenant.get(x.id);
        const sub = resolveSubscription({ plan: x.plan, trialEndsAt: x.trialEndsAt });
        return {
          name: x.name,
          city: x.city,
          owner: x.owner?.email ?? null,
          plan: x.plan === 'TRIAL' ? (sub.onTrial ? t(`تجربة (${sub.trialDaysLeft} يوم)`, `Trial (${sub.trialDaysLeft}d)`) : t('تجربة منتهية', 'Trial expired')) : x.plan,
          status: x.adminHiddenAt ? t('محظور إداريًا', 'Hidden by admin') : x.isPublished ? t('ظاهر', 'Visible') : t('مخفي', 'Unpublished'),
          createdAt: x.createdAt ? x.createdAt.toISOString() : null,
          bookings: b?.bookings ?? 0,
          completed: b?.completed ?? 0,
          revenue: round3(b?.revenue ?? 0),
          currency: x.currency ?? 'BHD',
          newClients: clientMap.get(x.id) ?? 0,
          messages: msgMap.get(x.id) ?? 0,
          whatsapp: x.whatsappAccount ? t('نعم', 'Yes') : null,
          lastBooking: lastMap.get(x.id)?.toISOString() ?? null,
        };
      });
      kpis = [
        { id: 'salons', label: t('إجمالي الصالونات', 'Total salons'), value: tenants.length, kind: 'int' },
        { id: 'active', label: t('صالونات لها حجوزات في الفترة', 'Salons with bookings in period'), value: bookingsByTenant.size, kind: 'int' },
        { id: 'inactive', label: t('بلا حجوزات في الفترة', 'No bookings in period'), value: tenants.length - bookingsByTenant.size, kind: 'int' },
      ];
      sections.push({
        id: 'salons',
        title: t('كل الصالونات', 'All salons'),
        columns: [
          { key: 'name', label: t('الصالون', 'Salon') },
          { key: 'city', label: t('المدينة', 'City') },
          { key: 'owner', label: t('بريد المالك', 'Owner email') },
          { key: 'plan', label: t('الباقة', 'Plan') },
          { key: 'status', label: t('الحالة', 'Status') },
          { key: 'createdAt', label: t('تاريخ التسجيل', 'Signup'), kind: 'date' },
          { key: 'bookings', label: t('الحجوزات', 'Bookings'), kind: 'int' },
          { key: 'completed', label: t('المكتملة', 'Completed'), kind: 'int' },
          { key: 'revenue', label: t('الإيراد', 'Revenue'), kind: 'int' },
          { key: 'currency', label: t('العملة', 'Currency') },
          { key: 'newClients', label: t('عملاء جدد', 'New clients'), kind: 'int' },
          { key: 'messages', label: t('الرسائل', 'Messages'), kind: 'int' },
          { key: 'whatsapp', label: t('واتساب', 'WhatsApp') },
          { key: 'lastBooking', label: t('آخر حجز', 'Last booking'), kind: 'date' },
        ],
        rows,
        truncated: tenants.length > MAX_ROWS,
        note: t(`عُرض ${MAX_ROWS} من ${tenants.length}`, `Showing ${MAX_ROWS} of ${tenants.length}`),
      });
      break;
    }

    case 'bookings': {
      title = t('تقرير الحجوزات على المنصة', 'Platform bookings report');
      const cancelled = appts.filter((a) => a.status === 'CANCELLED').length;
      kpis = [
        { id: 'bookings', label: t('الحجوزات', 'Bookings'), value: appts.length, kind: 'int' },
        { id: 'completed', label: t('المكتملة', 'Completed'), value: completed.length, kind: 'int' },
        { id: 'cancelled', label: t('الملغاة', 'Cancelled'), value: cancelled, kind: 'int', hint: `${t('نسبة الإلغاء', 'Cancellation rate')} ${pct(cancelled, appts.length)}%` },
        { id: 'revenue', label: t('الإيراد المحقق (دينار بحريني)', 'Realised revenue (BHD)'), value: bhdRevenue, kind: 'money' },
      ];
      sections.push(dailySection());
      const statusCount = new Map<string, number>();
      for (const a of appts) statusCount.set(a.status ?? '—', (statusCount.get(a.status ?? '—') ?? 0) + 1);
      sections.push({
        id: 'status',
        title: t('حسب الحالة', 'By status'),
        columns: [{ key: 'status', label: t('الحالة', 'Status') }, { key: 'count', label: t('العدد', 'Count'), kind: 'int' }, { key: 'share', label: t('النسبة', 'Share'), kind: 'percent' }],
        rows: [...statusCount.entries()].map(([status, count]) => ({ status, count, share: pct(count, appts.length) })),
        chart: { labelKey: 'status', valueKey: 'count' },
      });
      sections.push({
        id: 'revCurrency',
        title: t('الإيراد حسب العملة', 'Revenue by currency'),
        columns: [{ key: 'currency', label: t('العملة', 'Currency') }, { key: 'revenue', label: t('الإيراد', 'Revenue'), kind: 'int' }],
        rows: [...revenueByCurrency.entries()].map(([currency, revenue]) => ({ currency, revenue: round3(revenue) })),
      });
      sections.push({
        id: 'topSalons',
        title: t('أعلى 20 صالونًا', 'Top 20 salons'),
        columns: [
          { key: 'name', label: t('الصالون', 'Salon') },
          { key: 'bookings', label: t('الحجوزات', 'Bookings'), kind: 'int' },
          { key: 'completed', label: t('المكتملة', 'Completed'), kind: 'int' },
          { key: 'revenue', label: t('الإيراد', 'Revenue'), kind: 'int' },
          { key: 'currency', label: t('العملة', 'Currency') },
        ],
        rows: topSalons(20),
      });
      break;
    }

    case 'subscriptions': {
      title = t('تقرير الاشتراكات والتجارب', 'Subscriptions & trials report');
      const rows = tenants.map((x) => ({ x, sub: resolveSubscription({ plan: x.plan, trialEndsAt: x.trialEndsAt }, now) }));
      const paid = rows.filter((r) => r.sub.plan !== 'TRIAL').length;
      const onTrial = rows.filter((r) => r.sub.onTrial).length;
      const expired = rows.filter((r) => r.sub.trialExpired).length;
      kpis = [
        { id: 'paid', label: t('باقات مدفوعة', 'Paid plans'), value: paid, kind: 'int' },
        { id: 'trial', label: t('تجارب فعالة', 'Active trials'), value: onTrial, kind: 'int' },
        { id: 'expired', label: t('تجارب منتهية بلا اشتراك', 'Expired trials'), value: expired, kind: 'int', hint: t('لا تستقبل حجوزات جديدة', 'cannot take new bookings') },
        { id: 'conv', label: t('نسبة التحويل إلى مدفوع', 'Paid share'), value: pct(paid, tenants.length), kind: 'percent' },
      ];
      const cols = [
        { key: 'name', label: t('الصالون', 'Salon') },
        { key: 'owner', label: t('بريد المالك', 'Owner email') },
        { key: 'plan', label: t('الباقة', 'Plan') },
        { key: 'trialEnds', label: t('انتهاء التجربة', 'Trial ends'), kind: 'date' as const },
        { key: 'daysLeft', label: t('أيام متبقية', 'Days left'), kind: 'int' as const },
      ];
      const toRow = (r: (typeof rows)[number]): Row => ({ name: r.x.name, owner: r.x.owner?.email ?? null, plan: r.x.plan, trialEnds: r.x.trialEndsAt ? r.x.trialEndsAt.toISOString() : null, daysLeft: r.sub.trialDaysLeft });
      sections.push({
        id: 'ending',
        title: t('تجارب تنتهي خلال 7 أيام', 'Trials ending within 7 days'),
        columns: cols,
        rows: rows.filter((r) => r.sub.onTrial && r.sub.trialDaysLeft <= 7).sort((a, b) => a.sub.trialDaysLeft - b.sub.trialDaysLeft).map(toRow),
      });
      sections.push({
        id: 'expired',
        title: t('تجارب منتهية بلا اشتراك', 'Expired trials without a plan'),
        columns: cols,
        rows: rows.filter((r) => r.sub.trialExpired).slice(0, MAX_ROWS).map(toRow),
      });
      const plans = new Map<string, number>();
      for (const r of rows) plans.set(r.x.plan, (plans.get(r.x.plan) ?? 0) + 1);
      sections.push({
        id: 'plans',
        title: t('توزيع الباقات', 'Plan distribution'),
        columns: [{ key: 'plan', label: t('الباقة', 'Plan') }, { key: 'count', label: t('الصالونات', 'Salons'), kind: 'int' }],
        rows: [...plans.entries()].map(([plan, count]) => ({ plan, count })),
        chart: { labelKey: 'plan', valueKey: 'count' },
      });
      break;
    }

    case 'activity': {
      title = t('تقرير النشاط وسجل التدقيق', 'Activity & audit report');
      const logs = await prisma.adminAuditLog.findMany({ where: { createdAt: inRange }, orderBy: { createdAt: 'desc' }, take: MAX_ROWS });
      const byAction = new Map<string, number>();
      for (const l of logs) byAction.set(l.action, (byAction.get(l.action) ?? 0) + 1);
      const byAdmin = new Map<string, number>();
      for (const l of logs) byAdmin.set(l.adminEmail, (byAdmin.get(l.adminEmail) ?? 0) + 1);
      kpis = [
        { id: 'actions', label: t('إجراءات إدارية', 'Admin actions'), value: logs.length, kind: 'int' },
        { id: 'admins', label: t('مشرفون نشطون', 'Active admins'), value: byAdmin.size, kind: 'int' },
      ];
      sections.push({
        id: 'byAction',
        title: t('حسب نوع الإجراء', 'By action'),
        columns: [{ key: 'action', label: t('الإجراء', 'Action') }, { key: 'count', label: t('العدد', 'Count'), kind: 'int' }],
        rows: [...byAction.entries()].sort(([, a], [, b]) => b - a).map(([action, count]) => ({ action, count })),
        chart: { labelKey: 'action', valueKey: 'count' },
      });
      sections.push({
        id: 'log',
        title: t('آخر الإجراءات', 'Latest actions'),
        columns: [
          { key: 'at', label: t('الوقت', 'Time'), kind: 'datetime' },
          { key: 'admin', label: t('المشرف', 'Admin') },
          { key: 'action', label: t('الإجراء', 'Action') },
          { key: 'target', label: t('الهدف', 'Target') },
          { key: 'label', label: t('الاسم', 'Label') },
        ],
        rows: logs.map((l) => ({ at: l.createdAt.toISOString(), admin: l.adminEmail, action: l.action, target: l.targetType, label: l.targetLabel })),
        truncated: logs.length >= MAX_ROWS,
        note: t(`عُرض أحدث ${MAX_ROWS} إجراء`, `Showing latest ${MAX_ROWS} actions`),
      });
      break;
    }
  }

  return {
    type,
    scope: 'ADMIN',
    title,
    lang,
    tz: TZ,
    currency: 'BHD',
    period: { from: from.toISOString(), to: to.toISOString(), label: opts.periodLabel },
    generatedAt: new Date().toISOString(),
    kpis,
    sections,
  };
}

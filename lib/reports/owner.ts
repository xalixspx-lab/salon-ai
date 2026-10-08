import { prisma } from '@/lib/prisma';
import { localParts } from '@/lib/schedule';
import { MAX_ROWS, type Cell, type Col, type Kpi, type Lang, type OwnerReportType, type Report, type Row, type Section } from '@/lib/reports/types';

// منشئ تقارير صاحب الصالون. كل الاستعلامات مقيدة بـtenantId صراحةً (حتى لو شُغّل من cron خارج نطاق RLS).
const num = (d: unknown) => (d === null || d === undefined ? 0 : Number(d));
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const svcName = (n: unknown, lang: Lang) => {
  const o = (n ?? {}) as Record<string, string>;
  return (lang === 'en' ? o.en || o.ar : o.ar || o.en) || '—';
};

type Appt = {
  id: string;
  status: string | null;
  totalAmount: unknown;
  depositAmount: unknown;
  paymentStatus: string | null;
  startTime: Date | null;
  endTime: Date | null;
  appliedOfferId: string | null;
  service: { name: unknown } | null;
  employee: { id: string; name: string } | null;
  customer: { id: string; name: string; phone: string | null } | null;
};

export async function buildOwnerReport(opts: {
  tenantId: string;
  type: OwnerReportType;
  from: Date;
  to: Date;
  periodLabel: string;
  lang: Lang;
}): Promise<Report> {
  const { tenantId, type, from, to, lang } = opts;
  const t = (a: string, e: string) => (lang === 'en' ? e : a);

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { name: true, timezone: true, currency: true },
  });
  const tz = tenant.timezone || 'Asia/Bahrain';
  const currency = tenant.currency || 'BHD';
  const day = (d: Date) => localParts(d, tz).dateStr;

  const appts = (await prisma.appointment.findMany({
    where: { tenantId, startTime: { gte: from, lt: to } },
    orderBy: { startTime: 'desc' },
    take: 20000,
    select: {
      id: true,
      status: true,
      totalAmount: true,
      depositAmount: true,
      paymentStatus: true,
      startTime: true,
      endTime: true,
      appliedOfferId: true,
      service: { select: { name: true } },
      employee: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  })) as Appt[];

  const completed = appts.filter((a) => a.status === 'COMPLETED');
  const cancelled = appts.filter((a) => a.status === 'CANCELLED');
  const upcoming = appts.filter((a) => a.status === 'CONFIRMED' || a.status === 'PENDING_DEPOSIT');
  const revenue = round3(completed.reduce((s, a) => s + num(a.totalAmount), 0));
  const expected = round3(upcoming.reduce((s, a) => s + num(a.totalAmount), 0));
  const lost = round3(cancelled.reduce((s, a) => s + num(a.totalAmount), 0));
  const avgTicket = completed.length ? round3(revenue / completed.length) : 0;
  const cancelRate = pct(cancelled.length, appts.length);

  const statusLabel = (s: string | null) =>
    ({
      COMPLETED: t('مكتمل', 'Completed'),
      CONFIRMED: t('مؤكد', 'Confirmed'),
      PENDING_DEPOSIT: t('بانتظار العربون', 'Pending deposit'),
      CANCELLED: t('ملغى', 'Cancelled'),
    })[s ?? ''] ?? (s || '—');

  // ---------- أقسام مشتركة ----------
  const dailySection = (): Section => {
    const byDay = new Map<string, { bookings: number; completed: number; cancelled: number; revenue: number }>();
    for (const a of appts) {
      if (!a.startTime) continue;
      const k = day(a.startTime);
      const r = byDay.get(k) ?? { bookings: 0, completed: 0, cancelled: 0, revenue: 0 };
      r.bookings++;
      if (a.status === 'COMPLETED') {
        r.completed++;
        r.revenue += num(a.totalAmount);
      }
      if (a.status === 'CANCELLED') r.cancelled++;
      byDay.set(k, r);
    }
    const rows: Row[] = [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, r]) => ({ date, bookings: r.bookings, completed: r.completed, cancelled: r.cancelled, revenue: round3(r.revenue) }));
    return {
      id: 'daily',
      title: t('الاتجاه اليومي', 'Daily trend'),
      columns: [
        { key: 'date', label: t('اليوم', 'Day') },
        { key: 'bookings', label: t('الحجوزات', 'Bookings'), kind: 'int' },
        { key: 'completed', label: t('المكتملة', 'Completed'), kind: 'int' },
        { key: 'cancelled', label: t('الملغاة', 'Cancelled'), kind: 'int' },
        { key: 'revenue', label: t('الإيراد', 'Revenue'), kind: 'money' },
      ],
      rows,
      chart: { labelKey: 'date', valueKey: 'bookings' },
    };
  };

  const statusSection = (): Section => {
    const order = ['COMPLETED', 'CONFIRMED', 'PENDING_DEPOSIT', 'CANCELLED'];
    const rows: Row[] = order
      .map((s) => {
        const list = appts.filter((a) => a.status === s);
        return { status: statusLabel(s), count: list.length, share: pct(list.length, appts.length), amount: round3(list.reduce((x, a) => x + num(a.totalAmount), 0)) };
      })
      .filter((r) => (r.count as number) > 0);
    return {
      id: 'status',
      title: t('الحجوزات حسب الحالة', 'Bookings by status'),
      columns: [
        { key: 'status', label: t('الحالة', 'Status') },
        { key: 'count', label: t('العدد', 'Count'), kind: 'int' },
        { key: 'share', label: t('النسبة', 'Share'), kind: 'percent' },
        { key: 'amount', label: t('المبلغ', 'Amount'), kind: 'money' },
      ],
      rows,
      chart: { labelKey: 'status', valueKey: 'count' },
    };
  };

  const byServiceRows = (): Row[] => {
    const m = new Map<string, { name: string; bookings: number; completed: number; cancelled: number; revenue: number }>();
    for (const a of appts) {
      const name = svcName(a.service?.name, lang);
      const r = m.get(name) ?? { name, bookings: 0, completed: 0, cancelled: 0, revenue: 0 };
      r.bookings++;
      if (a.status === 'COMPLETED') {
        r.completed++;
        r.revenue += num(a.totalAmount);
      }
      if (a.status === 'CANCELLED') r.cancelled++;
      m.set(name, r);
    }
    return [...m.values()]
      .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
      .map((r) => ({ name: r.name, bookings: r.bookings, completed: r.completed, cancelled: r.cancelled, revenue: round3(r.revenue), avg: r.completed ? round3(r.revenue / r.completed) : 0, share: pct(r.revenue, revenue) }));
  };
  const serviceCols: Col[] = [
    { key: 'name', label: t('الخدمة', 'Service') },
    { key: 'bookings', label: t('الحجوزات', 'Bookings'), kind: 'int' },
    { key: 'completed', label: t('المكتملة', 'Completed'), kind: 'int' },
    { key: 'cancelled', label: t('الملغاة', 'Cancelled'), kind: 'int' },
    { key: 'revenue', label: t('الإيراد', 'Revenue'), kind: 'money' },
    { key: 'avg', label: t('متوسط السعر', 'Avg price'), kind: 'money' },
    { key: 'share', label: t('حصة الإيراد', 'Revenue share'), kind: 'percent' },
  ];

  const byStaffRows = (): Row[] => {
    const m = new Map<string, { name: string; bookings: number; completed: number; cancelled: number; revenue: number; minutes: number }>();
    for (const a of appts) {
      const name = a.employee?.name ?? t('بدون موظف', 'Unassigned');
      const r = m.get(name) ?? { name, bookings: 0, completed: 0, cancelled: 0, revenue: 0, minutes: 0 };
      r.bookings++;
      if (a.status === 'COMPLETED') {
        r.completed++;
        r.revenue += num(a.totalAmount);
      }
      if (a.status === 'CANCELLED') r.cancelled++;
      else if (a.startTime && a.endTime) r.minutes += (a.endTime.getTime() - a.startTime.getTime()) / 60000;
      m.set(name, r);
    }
    return [...m.values()]
      .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
      .map((r) => ({ name: r.name, bookings: r.bookings, completed: r.completed, cancelled: r.cancelled, revenue: round3(r.revenue), minutes: Math.round(r.minutes), share: pct(r.revenue, revenue) }));
  };
  const staffCols: Col[] = [
    { key: 'name', label: t('الموظف', 'Staff') },
    { key: 'bookings', label: t('الحجوزات', 'Bookings'), kind: 'int' },
    { key: 'completed', label: t('المكتملة', 'Completed'), kind: 'int' },
    { key: 'cancelled', label: t('الملغاة', 'Cancelled'), kind: 'int' },
    { key: 'revenue', label: t('الإيراد', 'Revenue'), kind: 'money' },
    { key: 'minutes', label: t('وقت محجوز', 'Booked time'), kind: 'minutes' },
    { key: 'share', label: t('حصة الإيراد', 'Revenue share'), kind: 'percent' },
  ];

  const topClients = () => {
    const m = new Map<string, { name: string; phone: string | null; visits: number; spend: number }>();
    for (const a of completed) {
      if (!a.customer) continue;
      const r = m.get(a.customer.id) ?? { name: a.customer.name, phone: a.customer.phone, visits: 0, spend: 0 };
      r.visits++;
      r.spend += num(a.totalAmount);
      m.set(a.customer.id, r);
    }
    return [...m.values()].sort((a, b) => b.spend - a.spend || b.visits - a.visits);
  };

  const kpisBase: Kpi[] = [
    { id: 'bookings', label: t('إجمالي الحجوزات', 'Total bookings'), value: appts.length, kind: 'int' },
    { id: 'completed', label: t('المكتملة', 'Completed'), value: completed.length, kind: 'int' },
    { id: 'cancelled', label: t('الملغاة', 'Cancelled'), value: cancelled.length, kind: 'int', hint: t('نسبة الإلغاء', 'Cancellation rate') + ` ${cancelRate}%` },
    { id: 'revenue', label: t('الإيراد المحقق', 'Realised revenue'), value: revenue, kind: 'money', hint: t('من الحجوزات المكتملة', 'from completed bookings') },
    { id: 'expected', label: t('إيراد متوقع', 'Expected revenue'), value: expected, kind: 'money', hint: t('مؤكد/بانتظار العربون', 'confirmed / pending deposit') },
    { id: 'avg', label: t('متوسط قيمة الحجز', 'Average ticket'), value: avgTicket, kind: 'money' },
  ];

  const sections: Section[] = [];
  let kpis: Kpi[] = kpisBase;
  let title = '';

  switch (type) {
    case 'overview': {
      title = t('نظرة عامة على الأداء', 'Performance overview');
      const newClients = await prisma.customer.count({ where: { tenantId, createdAt: { gte: from, lt: to } } });
      const [inbound, outbound] = await Promise.all([
        prisma.message.count({ where: { tenantId, senderRole: 'CUSTOMER', createdAt: { gte: from, lt: to } } }),
        prisma.message.count({ where: { tenantId, senderRole: { in: ['OWNER', 'AGENT'] }, createdAt: { gte: from, lt: to } } }),
      ]);
      kpis = [
        ...kpisBase,
        { id: 'newClients', label: t('عملاء جدد', 'New clients'), value: newClients, kind: 'int' },
        { id: 'inbound', label: t('رسائل واردة', 'Inbound messages'), value: inbound, kind: 'int' },
        { id: 'outbound', label: t('رسائل صادرة', 'Outbound messages'), value: outbound, kind: 'int' },
      ];
      sections.push(dailySection(), statusSection());
      const svc = byServiceRows().slice(0, 5);
      sections.push({ id: 'topServices', title: t('أفضل الخدمات', 'Top services'), columns: serviceCols, rows: svc });
      sections.push({ id: 'topStaff', title: t('أفضل الموظفين', 'Top staff'), columns: staffCols, rows: byStaffRows().slice(0, 5) });
      sections.push({
        id: 'topClients',
        title: t('أفضل العملاء إنفاقًا', 'Top clients by spend'),
        columns: [
          { key: 'name', label: t('العميل', 'Client') },
          { key: 'phone', label: t('الهاتف', 'Phone') },
          { key: 'visits', label: t('الزيارات', 'Visits'), kind: 'int' },
          { key: 'spend', label: t('الإنفاق', 'Spend'), kind: 'money' },
        ],
        rows: topClients().slice(0, 5).map((c) => ({ ...c, spend: round3(c.spend) })),
      });
      break;
    }

    case 'bookings': {
      title = t('تقرير الحجوزات التفصيلي', 'Detailed bookings report');
      sections.push(statusSection());
      const rows: Row[] = appts.slice(0, MAX_ROWS).map((a) => ({
        at: a.startTime ? a.startTime.toISOString() : null,
        client: a.customer?.name ?? '—',
        phone: a.customer?.phone ?? null,
        service: svcName(a.service?.name, lang),
        staff: a.employee?.name ?? null,
        status: statusLabel(a.status),
        amount: round3(num(a.totalAmount)),
        deposit: round3(num(a.depositAmount)),
        offer: a.appliedOfferId ? t('نعم', 'Yes') : null,
      }));
      sections.push({
        id: 'list',
        title: t('قائمة الحجوزات', 'Bookings list'),
        columns: [
          { key: 'at', label: t('الموعد', 'Appointment'), kind: 'datetime' },
          { key: 'client', label: t('العميل', 'Client') },
          { key: 'phone', label: t('الهاتف', 'Phone') },
          { key: 'service', label: t('الخدمة', 'Service') },
          { key: 'staff', label: t('الموظف', 'Staff') },
          { key: 'status', label: t('الحالة', 'Status') },
          { key: 'amount', label: t('المبلغ', 'Amount'), kind: 'money' },
          { key: 'deposit', label: t('العربون', 'Deposit'), kind: 'money' },
          { key: 'offer', label: t('عرض مطبّق', 'Offer applied') },
        ],
        rows,
        truncated: appts.length > MAX_ROWS,
        note: t(`عُرض أحدث ${MAX_ROWS} حجز من ${appts.length}`, `Showing latest ${MAX_ROWS} of ${appts.length} bookings`),
      });
      break;
    }

    case 'revenue': {
      title = t('تقرير الإيرادات', 'Revenue report');
      kpis = [
        ...kpisBase.filter((k) => ['revenue', 'expected', 'avg'].includes(k.id)),
        { id: 'lost', label: t('قيمة الحجوزات الملغاة', 'Value of cancelled bookings'), value: lost, kind: 'money' },
        { id: 'withOffer', label: t('حجوزات بعروض', 'Bookings with offers'), value: appts.filter((a) => a.appliedOfferId).length, kind: 'int' },
      ];
      sections.push(dailySection());
      sections.push({ id: 'byService', title: t('الإيراد حسب الخدمة', 'Revenue by service'), columns: serviceCols, rows: byServiceRows(), chart: { labelKey: 'name', valueKey: 'revenue' } });
      sections.push({ id: 'byStaff', title: t('الإيراد حسب الموظف', 'Revenue by staff'), columns: staffCols, rows: byStaffRows(), chart: { labelKey: 'name', valueKey: 'revenue' } });
      const pay = new Map<string, { n: number; amount: number }>();
      for (const a of appts) {
        const k = a.paymentStatus || t('غير محدد', 'Unspecified');
        const r = pay.get(k) ?? { n: 0, amount: 0 };
        r.n++;
        r.amount += num(a.totalAmount);
        pay.set(k, r);
      }
      sections.push({
        id: 'payment',
        title: t('حالة الدفع', 'Payment status'),
        columns: [
          { key: 'status', label: t('الحالة', 'Status') },
          { key: 'count', label: t('العدد', 'Count'), kind: 'int' },
          { key: 'amount', label: t('المبلغ', 'Amount'), kind: 'money' },
        ],
        rows: [...pay.entries()].map(([status, r]) => ({ status, count: r.n, amount: round3(r.amount) })),
      });
      break;
    }

    case 'services': {
      title = t('أداء الخدمات', 'Services performance');
      kpis = kpisBase.filter((k) => ['bookings', 'revenue', 'avg'].includes(k.id));
      sections.push({ id: 'services', title: t('كل الخدمات', 'All services'), columns: serviceCols, rows: byServiceRows(), chart: { labelKey: 'name', valueKey: 'bookings' } });
      break;
    }

    case 'staff': {
      title = t('أداء الموظفين', 'Staff performance');
      kpis = kpisBase.filter((k) => ['bookings', 'revenue'].includes(k.id));
      sections.push({ id: 'staff', title: t('كل الموظفين', 'All staff'), columns: staffCols, rows: byStaffRows(), chart: { labelKey: 'name', valueKey: 'revenue' } });
      break;
    }

    case 'clients': {
      title = t('تقرير العملاء', 'Clients report');
      const [totalClients, newClients] = await Promise.all([
        prisma.customer.count({ where: { tenantId } }),
        prisma.customer.count({ where: { tenantId, createdAt: { gte: from, lt: to } } }),
      ]);
      const activeIds = new Set(appts.filter((a) => a.customer && a.status !== 'CANCELLED').map((a) => a.customer!.id));
      let returning = 0;
      if (activeIds.size) {
        const before = await prisma.appointment.findMany({
          where: { tenantId, customerId: { in: [...activeIds] }, startTime: { lt: from }, status: 'COMPLETED' },
          select: { customerId: true },
          distinct: ['customerId'],
        });
        returning = before.length;
      }
      kpis = [
        { id: 'total', label: t('إجمالي العملاء', 'Total clients'), value: totalClients, kind: 'int' },
        { id: 'new', label: t('عملاء جدد', 'New clients'), value: newClients, kind: 'int' },
        { id: 'active', label: t('عملاء نشطون', 'Active clients'), value: activeIds.size, kind: 'int' },
        { id: 'returning', label: t('عملاء عائدون', 'Returning clients'), value: returning, kind: 'int', hint: t('زاروا قبل هذه الفترة', 'visited before this period') },
        { id: 'returnRate', label: t('نسبة العودة', 'Return rate'), value: pct(returning, activeIds.size), kind: 'percent' },
      ];
      sections.push({
        id: 'topClients',
        title: t('أفضل العملاء إنفاقًا', 'Top clients by spend'),
        columns: [
          { key: 'name', label: t('العميل', 'Client') },
          { key: 'phone', label: t('الهاتف', 'Phone') },
          { key: 'visits', label: t('الزيارات', 'Visits'), kind: 'int' },
          { key: 'spend', label: t('الإنفاق', 'Spend'), kind: 'money' },
        ],
        rows: topClients().slice(0, 25).map((c) => ({ ...c, spend: round3(c.spend) })),
      });

      // عملاء انقطعوا: لهم زيارة مكتملة سابقًا وآخر زيارة قبل أكثر من 60 يومًا
      const cutoff = new Date(to.getTime() - 60 * 86400000);
      const history = await prisma.customer.findMany({
        where: { tenantId, appointments: { some: { status: 'COMPLETED' } } },
        select: { name: true, phone: true, appointments: { where: { status: 'COMPLETED' }, select: { startTime: true, totalAmount: true }, orderBy: { startTime: 'desc' } } },
        take: 5000,
      });
      const lapsed = history
        .map((c) => ({ name: c.name, phone: c.phone, visits: c.appointments.length, last: c.appointments[0]?.startTime ?? null, spend: c.appointments.reduce((s, a) => s + num(a.totalAmount), 0) }))
        .filter((c) => c.last && c.last < cutoff)
        .sort((a, b) => (b.spend - a.spend))
        .slice(0, 50)
        .map((c) => ({ name: c.name, phone: c.phone, visits: c.visits, last: c.last ? c.last.toISOString() : null, spend: round3(c.spend) }));
      sections.push({
        id: 'lapsed',
        title: t('عملاء انقطعوا (أكثر من 60 يومًا)', 'Lapsed clients (60+ days)'),
        columns: [
          { key: 'name', label: t('العميل', 'Client') },
          { key: 'phone', label: t('الهاتف', 'Phone') },
          { key: 'visits', label: t('الزيارات', 'Visits'), kind: 'int' },
          { key: 'last', label: t('آخر زيارة', 'Last visit'), kind: 'date' },
          { key: 'spend', label: t('إجمالي إنفاقه', 'Lifetime spend'), kind: 'money' },
        ],
        rows: lapsed,
      });
      break;
    }

    case 'messages': {
      title = t('تقرير الرسائل والمحادثات', 'Messages & conversations report');
      const msgs = await prisma.message.findMany({
        where: { tenantId, createdAt: { gte: from, lt: to } },
        orderBy: [{ conversationId: 'asc' }, { createdAt: 'asc' }],
        take: 50000,
        select: { conversationId: true, senderRole: true, createdAt: true },
      });
      const convIds = new Set(msgs.map((m) => m.conversationId));
      let inbound = 0;
      let outbound = 0;
      const byDay = new Map<string, { inbound: number; outbound: number }>();
      let waitSum = 0;
      let waitN = 0;
      const pendingSince = new Map<string, Date>();
      for (const m of msgs) {
        const d = day(m.createdAt);
        const r = byDay.get(d) ?? { inbound: 0, outbound: 0 };
        if (m.senderRole === 'CUSTOMER') {
          inbound++;
          r.inbound++;
          if (!pendingSince.has(m.conversationId)) pendingSince.set(m.conversationId, m.createdAt);
        } else {
          outbound++;
          r.outbound++;
          const since = pendingSince.get(m.conversationId);
          if (since) {
            waitSum += (m.createdAt.getTime() - since.getTime()) / 60000;
            waitN++;
            pendingSince.delete(m.conversationId);
          }
        }
        byDay.set(d, r);
      }
      const newContacts = await prisma.contact.count({ where: { tenantId, createdAt: { gte: from, lt: to } } });
      kpis = [
        { id: 'convs', label: t('محادثات نشطة', 'Active conversations'), value: convIds.size, kind: 'int' },
        { id: 'in', label: t('رسائل واردة', 'Inbound messages'), value: inbound, kind: 'int' },
        { id: 'out', label: t('رسائل صادرة', 'Outbound messages'), value: outbound, kind: 'int' },
        { id: 'newContacts', label: t('جهات اتصال واتساب جديدة', 'New WhatsApp contacts'), value: newContacts, kind: 'int' },
        { id: 'wait', label: t('متوسط زمن أول رد', 'Avg first-response time'), value: waitN ? Math.round((waitSum / waitN) * 10) / 10 : null, kind: 'minutes' },
      ];
      sections.push({
        id: 'perDay',
        title: t('الرسائل حسب اليوم', 'Messages per day'),
        columns: [
          { key: 'date', label: t('اليوم', 'Day') },
          { key: 'inbound', label: t('واردة', 'Inbound'), kind: 'int' },
          { key: 'outbound', label: t('صادرة', 'Outbound'), kind: 'int' },
        ],
        rows: [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, r]) => ({ date, ...r })),
        chart: { labelKey: 'date', valueKey: 'inbound' },
      });
      // محادثات بلا رد: آخر رسالة من العميل ومرّت ساعة فأكثر
      const open = await prisma.conversation.findMany({
        where: { tenantId },
        orderBy: { lastMessageAt: 'desc' },
        take: 300,
        select: {
          lastMessageAt: true,
          account: { select: { name: true } },
          contact: { select: { name: true, phone: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { senderRole: true, body: true, createdAt: true } },
        },
      });
      const hourAgo = Date.now() - 3600 * 1000;
      const unanswered: Row[] = open
        .filter((c) => c.messages[0]?.senderRole === 'CUSTOMER' && c.messages[0].createdAt.getTime() < hourAgo)
        .slice(0, 50)
        .map((c) => ({
          name: c.account?.name ?? c.contact?.name ?? (c.contact ? `+${c.contact.phone}` : '—'),
          phone: c.contact?.phone ?? null,
          last: c.messages[0].createdAt.toISOString(),
          text: c.messages[0].body.slice(0, 120),
        }));
      sections.push({
        id: 'unanswered',
        title: t('محادثات بلا رد حاليًا', 'Conversations awaiting a reply'),
        columns: [
          { key: 'name', label: t('العميل', 'Client') },
          { key: 'phone', label: t('الهاتف', 'Phone') },
          { key: 'last', label: t('آخر رسالة', 'Last message'), kind: 'datetime' },
          { key: 'text', label: t('النص', 'Text') },
        ],
        rows: unanswered,
        note: t('لقطة حالية بغض النظر عن الفترة المختارة', 'Current snapshot regardless of the selected period'),
      });
      break;
    }
  }

  return {
    type,
    scope: 'OWNER',
    title: `${tenant.name} — ${title}`,
    lang,
    tz,
    currency,
    period: { from: from.toISOString(), to: to.toISOString(), label: opts.periodLabel },
    generatedAt: new Date().toISOString(),
    kpis,
    sections,
  };
}

export type { Cell };

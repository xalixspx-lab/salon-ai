// تسميات أنواع التقارير في الواجهة (ثنائية اللغة) — المعرّفات تطابق OWNER_REPORT_TYPES / ADMIN_REPORT_TYPES
type Opt = { id: string; label: string; hint: string };

export function ownerTypeOptions(en: boolean): Opt[] {
  return en
    ? [
        { id: 'overview', label: 'Overview', hint: 'Bookings, revenue, top services/staff/clients and messages at a glance' },
        { id: 'bookings', label: 'Bookings', hint: 'Status breakdown and the full detailed list' },
        { id: 'revenue', label: 'Revenue', hint: 'Daily revenue, by service, by staff, payment status, lost value' },
        { id: 'services', label: 'Services', hint: 'Performance of each service' },
        { id: 'staff', label: 'Staff', hint: 'Bookings, revenue and booked minutes per staff member' },
        { id: 'clients', label: 'Clients', hint: 'New/returning clients, top spenders, lapsed clients' },
        { id: 'messages', label: 'Messages', hint: 'WhatsApp volume, response time and unanswered chats' },
      ]
    : [
        { id: 'overview', label: 'نظرة عامة', hint: 'الحجوزات والإيرادات وأفضل الخدمات والموظفين والعملاء والرسائل' },
        { id: 'bookings', label: 'الحجوزات', hint: 'توزيع الحالات وقائمة الحجوزات التفصيلية كاملة' },
        { id: 'revenue', label: 'الإيرادات', hint: 'الإيراد اليومي وحسب الخدمة والموظف وحالة الدفع والقيمة المفقودة' },
        { id: 'services', label: 'الخدمات', hint: 'أداء كل خدمة' },
        { id: 'staff', label: 'الموظفون', hint: 'الحجوزات والإيرادات ودقائق الحجز لكل موظف' },
        { id: 'clients', label: 'العملاء', hint: 'الجدد والعائدون وأعلى الإنفاق والعملاء المنقطعون' },
        { id: 'messages', label: 'الرسائل', hint: 'حجم رسائل واتساب وزمن الرد والمحادثات غير المردود عليها' },
      ];
}

export function adminTypeOptions(en: boolean): Opt[] {
  return en
    ? [
        { id: 'overview', label: 'Platform overview', hint: 'Salons, owners, bookings, revenue, WhatsApp and growth' },
        { id: 'salons', label: 'Salons', hint: 'Per-salon table: plan, status, bookings, revenue, activity' },
        { id: 'bookings', label: 'Bookings', hint: 'Platform bookings by day, status and currency' },
        { id: 'subscriptions', label: 'Subscriptions', hint: 'Paid/trial/expired and subscriptions ending soon' },
        { id: 'activity', label: 'Admin activity', hint: 'Audit-log actions by type and the latest entries' },
      ]
    : [
        { id: 'overview', label: 'نظرة عامة على المنصة', hint: 'الصالونات والملاك والحجوزات والإيرادات وواتساب والنمو' },
        { id: 'salons', label: 'الصالونات', hint: 'جدول لكل صالون: الباقة والحالة والحجوزات والإيراد والنشاط' },
        { id: 'bookings', label: 'الحجوزات', hint: 'حجوزات المنصة حسب اليوم والحالة والعملة' },
        { id: 'subscriptions', label: 'الاشتراكات', hint: 'المدفوع والتجريبي والمنتهي وما ينتهي قريبًا' },
        { id: 'activity', label: 'نشاط المشرفين', hint: 'إجراءات سجل التدقيق حسب النوع وآخر السجلات' },
      ];
}

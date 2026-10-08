'use client';

import { useState } from 'react';
import { Bell, CalendarDays, LogOut, Settings, UserRound, Users } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardBody, CardHeader, StatCard } from '@/components/ui/Card';
import Dropdown from '@/components/ui/Dropdown';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Segmented from '@/components/ui/Segmented';
import Skeleton from '@/components/ui/Skeleton';
import Switch from '@/components/ui/Switch';
import Tabs from '@/components/ui/Tabs';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import Tooltip from '@/components/ui/Tooltip';

function Inner({ ar }: { ar: boolean }) {
  const L = (a: string, e: string) => (ar ? a : e);
  const toast = useToast();
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState<'day' | 'week' | 'month'>('week');
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-8" dir={ar ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader title={L('الأزرار والشارات', 'Buttons and badges')} />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button>{L('أساسي', 'Primary')}</Button>
            <Button variant="dark">{L('داكن', 'Dark')}</Button>
            <Button variant="secondary">{L('ثانوي', 'Secondary')}</Button>
            <Button variant="soft">{L('ناعم', 'Soft')}</Button>
            <Button variant="ghost">{L('شفاف', 'Ghost')}</Button>
            <Button variant="danger">{L('حذف', 'Delete')}</Button>
            <Button disabled>{L('معطّل', 'Disabled')}</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">{L('مميز', 'Featured')}</Badge>
            <Badge tone="green">{L('مكتمل', 'Completed')}</Badge>
            <Badge tone="amber">{L('قيد الانتظار', 'Pending')}</Badge>
            <Badge tone="red">{L('ملغى', 'Cancelled')}</Badge>
            <Badge tone="blue">{L('مؤكد', 'Confirmed')}</Badge>
            <Badge>{L('عادي', 'Neutral')}</Badge>
          </div>
        </CardBody>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label={L('إيراد الشهر', 'Monthly revenue')} value="1,240 BHD" delta={{ value: '8.2%', up: true }} icon={<CalendarDays className="h-[18px] w-[18px]" />} />
        <StatCard label={L('عملاء جدد', 'New clients')} value="48" delta={{ value: '3.1%', up: false }} icon={<Users className="h-[18px] w-[18px]" />} />
        <StatCard label={L('نسبة الإلغاء', 'Cancel rate')} value="4%" hint={L('أقل من الشهر الماضي', 'Lower than last month')} icon={<Bell className="h-[18px] w-[18px]" />} />
      </div>

      <Card>
        <CardHeader title={L('عناصر التحكم', 'Controls')} subtitle={L('مفاتيح وقوائم وتلميحات', 'Switches, menus and tooltips')} />
        <CardBody className="space-y-5">
          <div className="flex items-center gap-3">
            <Switch checked={on} onChange={(v) => { setOn(v); toast(v ? L('تم التفعيل', 'Enabled') : L('تم الإيقاف', 'Disabled'), v ? 'success' : 'info'); }} label="demo" />
            <span className="text-sm text-stone-700">{on ? L('مفعّل', 'On') : L('متوقف', 'Off')}</span>
          </div>
          <Segmented value={seg} onChange={setSeg} options={[{ value: 'day', label: L('يوم', 'Day') }, { value: 'week', label: L('أسبوع', 'Week') }, { value: 'month', label: L('شهر', 'Month') }]} />
          <div className="flex flex-wrap items-center gap-3">
            <Dropdown
              trigger={<span className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm"><Avatar name="Sara Ali" size={26} /> Sara Ali</span>}
              items={[
                { type: 'label', label: L('الحساب', 'Account') },
                { label: L('الملف الشخصي', 'Profile'), icon: <UserRound />, onSelect: () => toast(L('الملف الشخصي', 'Profile'), 'info') },
                { label: L('الإعدادات', 'Settings'), icon: <Settings />, onSelect: () => toast(L('الإعدادات', 'Settings'), 'info') },
                { type: 'separator' },
                { label: L('تسجيل الخروج', 'Sign out'), icon: <LogOut />, danger: true, onSelect: () => toast(L('تم الخروج', 'Signed out'), 'error') },
              ]}
            />
            <Tooltip text={L('هذا تلميح', 'This is a tooltip')}>
              <Button variant="secondary" size="sm">{L('مرّر هنا', 'Hover me')}</Button>
            </Tooltip>
            <Button variant="soft" onClick={() => setOpen(true)}>{L('افتح نافذة', 'Open modal')}</Button>
            <Button variant="secondary" onClick={() => toast(L('تم الحفظ بنجاح', 'Saved'))}>{L('أظهر إشعارًا', 'Show toast')}</Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Tabs
            items={[
              { id: 'a', label: L('نظرة عامة', 'Overview'), content: <p className="text-sm text-stone-600">{L('محتوى التبويب الأول.', 'First tab content.')}</p> },
              { id: 'b', label: L('الحجوزات', 'Bookings'), count: 12, content: <div className="space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-3/4" /></div> },
              { id: 'c', label: L('فارغ', 'Empty'), content: <EmptyState icon={<CalendarDays className="h-6 w-6" />} title={L('لا توجد حجوزات بعد', 'No bookings yet')} text={L('ستظهر هنا حجوزاتك فور وصولها.', 'Your bookings will appear here.')} action={<Button size="sm">{L('حجز جديد', 'New booking')}</Button>} /> },
            ]}
          />
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={L('تأكيد الحجز', 'Confirm booking')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>{L('إلغاء', 'Cancel')}</Button>
            <Button size="sm" onClick={() => { setOpen(false); toast(L('تم التأكيد', 'Confirmed')); }}>{L('تأكيد', 'Confirm')}</Button>
          </>
        }
      >
        {L('هل تريد تأكيد هذا الحجز؟ سيصل العميل إشعار فوري.', 'Confirm this booking? The client is notified instantly.')}
      </Modal>
    </div>
  );
}

export default function KitShowcase({ ar }: { ar: boolean }) {
  return (
    <ToastProvider>
      <Inner ar={ar} />
    </ToastProvider>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { DEFAULT_TIMEZONE, zonedToUtc } from '@/lib/schedule';

interface Appt {
  id: string;
  status: string | null;
  startTime: string;
  service: { name: Record<string, string> | null } | null;
  customer: { name: string } | null;
  employee: { id: string; name: string } | null;
  employeeId: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-blue-50 border-blue-300 text-blue-800',
  COMPLETED: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  PENDING_DEPOSIT: 'bg-amber-50 border-amber-300 text-amber-800',
  CANCELLED: 'bg-red-50 border-red-200 text-red-400 line-through',
};

const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const weekdayOf = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay();
const startOfWeek = (ymd: string) => addDays(ymd, -weekdayOf(ymd)); // الأسبوع يبدأ الأحد
const startOfMonth = (ymd: string) => `${ymd.slice(0, 7)}-01`;

export default function CalendarPage() {
  const t = useTranslations('Calendar');
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'ar';
  const loc = locale === 'ar' ? 'ar-BH' : 'en-GB';

  const [tz, setTz] = useState(DEFAULT_TIMEZONE);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(() => new Date().toISOString().slice(0, 10));
  const [staffFilter, setStaffFilter] = useState('');
  const [staff, setStaff] = useState<Array<{ id: string; name: string }>>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data.timezone) {
          setTz(d.data.timezone);
          setAnchor(new Date().toLocaleDateString('en-CA', { timeZone: d.data.timezone }));
        }
      });
    fetch('/api/dashboard/staff')
      .then((r) => r.json())
      .then((d) => d.success && setStaff(d.data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))));
  }, []);

  // نافذة العرض: أسبوع أو الأسابيع التي تغطي الشهر
  const days = useMemo(() => {
    if (view === 'week') {
      const s = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => addDays(s, i));
    }
    const first = startOfMonth(anchor);
    const gridStart = startOfWeek(first);
    const next = addDays(first, 32).slice(0, 7) + '-01';
    const monthDays = Math.round((Date.parse(next) - Date.parse(first)) / 86400000);
    const total = Math.ceil((weekdayOf(first) + monthDays) / 7) * 7;
    return Array.from({ length: total }, (_, i) => addDays(gridStart, i));
  }, [view, anchor]);

  const load = useCallback(async () => {
    const from = zonedToUtc(days[0], '00:00', tz).toISOString();
    const to = zonedToUtc(addDays(days[days.length - 1], 1), '00:00', tz).toISOString();
    const res = await fetch(`/api/dashboard/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    const data = await res.json();
    if (data.success) setAppts(data.data);
  }, [days, tz]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, Appt[]>();
    for (const a of appts) {
      if (staffFilter && a.employeeId !== staffFilter) continue;
      const key = new Date(a.startTime).toLocaleDateString('en-CA', { timeZone: tz });
      map.set(key, [...(map.get(key) || []), a]);
    }
    for (const list of map.values()) list.sort((x, y) => x.startTime.localeCompare(y.startTime));
    return map;
  }, [appts, staffFilter, tz]);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const step = (dir: number) => setAnchor(view === 'week' ? addDays(anchor, 7 * dir) : addDays(startOfMonth(anchor), dir > 0 ? 32 : -1).slice(0, 7) + '-01');
  const title =
    view === 'week'
      ? `${new Date(`${days[0]}T12:00:00Z`).toLocaleDateString(loc, { day: 'numeric', month: 'short', timeZone: 'UTC' })} – ${new Date(`${days[6]}T12:00:00Z`).toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`
      : new Date(`${startOfMonth(anchor)}T12:00:00Z`).toLocaleDateString(loc, { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const svcName = (a: Appt) => (a.service?.name && (a.service.name[locale] || a.service.name.ar || a.service.name.en)) || '—';
  const timeOf = (a: Appt) => new Date(a.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });
  const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(loc, { weekday: 'short', day: 'numeric', timeZone: 'UTC' });

  const ApptCard = ({ a }: { a: Appt }) => (
    <div className={`border rounded-md px-2 py-1 text-xs ${STATUS_STYLES[a.status || ''] || 'bg-stone-50 border-stone-200'}`}>
      <div className="font-semibold" dir="ltr">{timeOf(a)}</div>
      <div>{svcName(a)}</div>
      <div className="text-stone-500">{a.customer?.name || '—'}{a.employee ? ` · ${a.employee.name}` : ''}</div>
    </div>
  );

  const activeDay = selectedDay && byDay.get(selectedDay) ? selectedDay : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-stone-900">{t('title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} className="border rounded-md text-sm px-2 py-1.5 text-black">
            <option value="">{t('allStaff')}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex rounded-md border overflow-hidden text-sm">
            {(['week', 'month'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 ${view === v ? 'bg-brand-600 text-white' : 'bg-white text-stone-700'}`}>
                {t(v)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => step(-1)} className="px-3 py-1.5 border rounded-md text-sm bg-white">{t('prev')}</button>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-stone-800">{title}</span>
          <button onClick={() => setAnchor(today)} className="text-xs text-brand-600 underline">{t('today')}</button>
        </div>
        <button onClick={() => step(1)} className="px-3 py-1.5 border rounded-md text-sm bg-white">{t('next')}</button>
      </div>

      {view === 'week' ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {days.map((d) => (
            <div key={d} className={`rounded-xl border p-2 min-h-32 bg-white ${d === today ? 'border-brand-400' : 'border-stone-200'}`}>
              <p className={`text-xs font-semibold mb-2 ${d === today ? 'text-brand-700' : 'text-stone-500'}`}>{dayLabel(d)}</p>
              <div className="space-y-1.5">
                {(byDay.get(d) || []).map((a) => <ApptCard key={a.id} a={a} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-500 mb-1">
            {days.slice(0, 7).map((d) => (
              <div key={d}>{new Date(`${d}T12:00:00Z`).toLocaleDateString(loc, { weekday: 'short', timeZone: 'UTC' })}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const list = byDay.get(d) || [];
              const inMonth = d.slice(0, 7) === startOfMonth(anchor).slice(0, 7);
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`rounded-lg border p-1.5 min-h-16 text-start ${inMonth ? 'bg-white' : 'bg-stone-50 text-stone-400'} ${d === today ? 'border-brand-400' : 'border-stone-200'} ${selectedDay === d ? 'ring-2 ring-brand-300' : ''}`}
                >
                  <div className="text-xs font-medium">{Number(d.slice(8))}</div>
                  {list.length > 0 && (
                    <div className="mt-1 inline-block rounded-full bg-brand-100 text-brand-800 text-[10px] font-semibold px-1.5">{list.length}</div>
                  )}
                </button>
              );
            })}
          </div>
          {selectedDay && (
            <div className="mt-4 bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-sm font-semibold mb-2">{dayLabel(selectedDay)}</p>
              {activeDay ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(byDay.get(activeDay) || []).map((a) => <ApptCard key={a.id} a={a} />)}
                </div>
              ) : (
                <p className="text-sm text-stone-400">{t('noAppointments')}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import ReportView from '@/components/reports/ReportView';
import type { Report } from '@/lib/reports/types';

type Schedule = { id: string; reportType: string; frequency: string; dayOfWeek: number | null; dayOfMonth: number | null; locale: string; isActive: boolean; lastRunAt: string | null; lastError: string | null };
type TypeOpt = { id: string; label: string; hint: string };

const PRESETS = ['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth', 'custom'] as const;

// مساحة عمل التقارير المشتركة (مالك/مشرف): توليد حسب الطلب، تنزيل CSV، طباعة/PDF، وجدولة بريدية.
export default function ReportsWorkspace({ apiBase, types, accent }: { apiBase: '/api/dashboard' | '/api/admin'; types: TypeOpt[]; accent: 'brand' | 'slate' }) {
  const locale = useLocale();
  const en = locale === 'en';
  const L = (a: string, e: string) => (en ? e : a);
  const btn = accent === 'slate' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-brand-600 hover:bg-brand-700';

  const [type, setType] = useState(types[0].id);
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>('last30');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const presetLabel: Record<string, string> = {
    today: L('اليوم', 'Today'),
    yesterday: L('أمس', 'Yesterday'),
    last7: L('آخر 7 أيام', 'Last 7 days'),
    last30: L('آخر 30 يومًا', 'Last 30 days'),
    thisMonth: L('هذا الشهر', 'This month'),
    lastMonth: L('الشهر الماضي', 'Last month'),
    custom: L('فترة مخصصة', 'Custom range'),
  };

  const query = useMemo(() => {
    const p = new URLSearchParams({ type, lang: locale });
    if (preset === 'custom') {
      p.set('preset', 'custom');
      p.set('from', from);
      p.set('to', to);
    } else p.set('preset', preset);
    return p.toString();
  }, [type, preset, from, to, locale]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/reports?${query}`);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) setReport(json.data);
      else setError(json?.error || L('تعذّر إنشاء التقرير', 'Could not generate the report'));
    } catch {
      setError(L('تعذّر الاتصال بالخادم', 'Could not reach the server'));
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, query]);

  useEffect(() => {
    // أول تحميل: نظرة عامة لآخر 30 يومًا
    // eslint-disable-next-line react-hooks/set-state-in-effect
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- الجدولة ----------
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [max, setMax] = useState(5);
  const [enabled, setEnabled] = useState(true);
  const [sType, setSType] = useState(types[0].id);
  const [sFreq, setSFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [sDow, setSDow] = useState(0);
  const [sDom, setSDom] = useState(1);
  const [sMsg, setSMsg] = useState('');

  const days = en ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const typeLabel = (id: string) => types.find((x) => x.id === id)?.label ?? id;
  const freqText = (s: Schedule) =>
    s.frequency === 'DAILY' ? L('يوميًا', 'Daily') : s.frequency === 'WEEKLY' ? `${L('أسبوعيًا', 'Weekly')} · ${days[s.dayOfWeek ?? 0]}` : `${L('شهريًا', 'Monthly')} · ${L('يوم', 'day')} ${s.dayOfMonth}`;

  const loadSchedules = useCallback(async () => {
    const res = await fetch(`${apiBase}/report-schedules`).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (json?.success) {
      setSchedules(json.data);
      setMax(json.max ?? 5);
      setEnabled(json.enabled !== false);
    }
  }, [apiBase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSchedules();
  }, [loadSchedules]);

  const createSchedule = async () => {
    setSMsg('');
    const res = await fetch(`${apiBase}/report-schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportType: sType, frequency: sFreq, dayOfWeek: sDow, dayOfMonth: sDom, locale }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (res?.ok && json?.success) {
      setSMsg(L('تمت إضافة الجدولة', 'Schedule added'));
      loadSchedules();
    } else setSMsg(json?.code === 'DISABLED' ? L('الخدمة غير مفعّلة لصالونك', 'This service is not enabled for your salon') : json?.code === 'LIMIT' ? L(`الحد الأقصى ${max} جداول`, `Maximum ${max} schedules`) : L('تعذّرت الإضافة', 'Could not add'));
  };
  const toggle = async (s: Schedule) => {
    await fetch(`${apiBase}/report-schedules/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !s.isActive }) });
    loadSchedules();
  };
  const remove = async (s: Schedule) => {
    if (!window.confirm(L('حذف هذه الجدولة؟', 'Delete this schedule?'))) return;
    await fetch(`${apiBase}/report-schedules/${s.id}`, { method: 'DELETE' });
    loadSchedules();
  };
  const sendNow = async (s: Schedule) => {
    setSMsg('…');
    const res = await fetch(`${apiBase}/report-schedules/${s.id}/send`, { method: 'POST' }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    setSMsg(json?.success ? L('أُرسلت نسخة إلى بريدك', 'A copy was sent to your email') : res?.status === 429 ? L('محاولات كثيرة، حاول لاحقًا', 'Too many attempts, try later') : L('تعذّر الإرسال', 'Could not send'));
  };

  const field = 'w-full px-3 py-2.5 rounded-xl border border-stone-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="space-y-6">
      {/* ---------- التوليد حسب الطلب ---------- */}
      <section className="no-print bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6">
        <h2 className="text-base font-bold text-stone-800 mb-3">{L('إنشاء تقرير', 'Generate a report')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block sm:col-span-2">
            <span className="block text-xs text-stone-500 mb-1">{L('نوع التقرير', 'Report type')}</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
              {types.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
            <span className="block text-[11px] text-stone-400 mt-1">{types.find((x) => x.id === type)?.hint}</span>
          </label>
          <label className="block">
            <span className="block text-xs text-stone-500 mb-1">{L('الفترة', 'Period')}</span>
            <select value={preset} onChange={(e) => setPreset(e.target.value as (typeof PRESETS)[number])} className={field}>
              {PRESETS.map((p) => (
                <option key={p} value={p}>
                  {presetLabel[p]}
                </option>
              ))}
            </select>
          </label>
          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
              <label className="block">
                <span className="block text-xs text-stone-500 mb-1">{L('من', 'From')}</span>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
              </label>
              <label className="block">
                <span className="block text-xs text-stone-500 mb-1">{L('إلى', 'To')}</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
              </label>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={generate} disabled={loading || (preset === 'custom' && (!from || !to))} className={`${btn} text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50`}>
            {loading ? '…' : L('عرض التقرير', 'Show report')}
          </button>
          <a href={`${apiBase}/reports?${query}&format=csv`} className="border border-stone-300 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50">
            ⬇ {L('تنزيل CSV (Excel)', 'Download CSV (Excel)')}
          </a>
          <button onClick={() => window.print()} disabled={!report} className="border border-stone-300 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 disabled:opacity-50">
            🖨 {L('طباعة / حفظ PDF', 'Print / Save as PDF')}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
      </section>

      {report && <ReportView report={report} />}

      {/* ---------- الجدولة ---------- */}
      <section className="no-print bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6">
        <h2 className="text-base font-bold text-stone-800">{L('التقارير الدورية بالبريد', 'Scheduled email reports')}</h2>
        {!enabled && (
          <p className="mt-3 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm" role="status">
            {L('الإرسال البريدي الدوري غير مفعّل لصالونك حاليًا. تواصل مع إدارة المنصة لتفعيله. التقارير حسب الطلب متاحة دائمًا.', 'Scheduled email reports are not enabled for your salon. Contact the platform team to enable them. On-demand reports are always available.')}
          </p>
        )}
        <p className="text-xs text-stone-500 mt-1 mb-4">
          {L('يصلك التقرير على بريد حسابك صباح اليوم المحدد (7 صباحًا بتوقيت البحرين) مع ملف CSV كامل. اليومي يغطي الأمس، والأسبوعي آخر 7 أيام كاملة، والشهري الشهر الماضي.', 'The report is emailed to your account address on the chosen day (7 AM Bahrain time) with a full CSV. Daily covers yesterday, weekly the last 7 full days, monthly the previous month.')}
        </p>

        {schedules.length > 0 && (
          <ul className="divide-y divide-stone-100 border border-stone-200 rounded-xl mb-4">
            {schedules.map((s) => (
              <li key={s.id} className="p-3 flex flex-wrap items-center gap-2 text-sm">
                <div className="flex-1 min-w-48">
                  <p className="font-semibold text-stone-800">{typeLabel(s.reportType)}</p>
                  <p className="text-xs text-stone-500">
                    {freqText(s)} · {s.locale === 'en' ? 'EN' : 'AR'}
                    {s.lastRunAt && ` · ${L('آخر إرسال', 'last sent')} ${s.lastRunAt.slice(0, 10)}`}
                  </p>
                  {s.lastError && <p className="text-xs text-red-600">{s.lastError}</p>}
                </div>
                <button onClick={() => toggle(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                  {s.isActive ? L('فعّالة', 'Active') : L('متوقفة', 'Paused')}
                </button>
                <button onClick={() => sendNow(s)} disabled={!enabled} className="px-3 py-1.5 rounded-lg text-xs border border-stone-300 text-stone-700 disabled:opacity-40">
                  {L('أرسل الآن', 'Send now')}
                </button>
                <button onClick={() => remove(s)} className="px-3 py-1.5 rounded-lg text-xs border border-red-200 text-red-700">
                  {L('حذف', 'Delete')}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <label className="block">
            <span className="block text-xs text-stone-500 mb-1">{L('التقرير', 'Report')}</span>
            <select value={sType} onChange={(e) => setSType(e.target.value)} className={field}>
              {types.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-stone-500 mb-1">{L('التكرار', 'Frequency')}</span>
            <select value={sFreq} onChange={(e) => setSFreq(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')} className={field}>
              <option value="DAILY">{L('يوميًا', 'Daily')}</option>
              <option value="WEEKLY">{L('أسبوعيًا', 'Weekly')}</option>
              <option value="MONTHLY">{L('شهريًا', 'Monthly')}</option>
            </select>
          </label>
          {sFreq === 'WEEKLY' && (
            <label className="block">
              <span className="block text-xs text-stone-500 mb-1">{L('اليوم', 'Day')}</span>
              <select value={sDow} onChange={(e) => setSDow(Number(e.target.value))} className={field}>
                {days.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}
          {sFreq === 'MONTHLY' && (
            <label className="block">
              <span className="block text-xs text-stone-500 mb-1">{L('يوم الشهر', 'Day of month')}</span>
              <select value={sDom} onChange={(e) => setSDom(Number(e.target.value))} className={field}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button onClick={createSchedule} disabled={!enabled || schedules.length >= max} className={`${btn} text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50`}>
            + {L('إضافة جدولة', 'Add schedule')}
          </button>
        </div>
        {sMsg && <p className="mt-3 text-sm text-stone-600" role="status">{sMsg}</p>}
      </section>
    </div>
  );
}

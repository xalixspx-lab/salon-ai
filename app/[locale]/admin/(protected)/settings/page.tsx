'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams } from 'next/navigation';

interface Settings {
  trialDays: number;
  prices: { BASIC: number; PROFESSIONAL: number; ENTERPRISE: number };
  announcement: { textAr: string; textEn: string; active: boolean };
  automations: { reports: boolean; reminders: boolean; winBack: boolean };
}

export default function AdminPlatformSettingsPage() {
  const params = useParams();
  const ar = params.locale !== 'en';
  const L = (a: string, e: string) => (ar ? a : e);
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => d.success && setS(d.data));
  }, []);

  if (!s) return <p className="text-slate-400 text-sm">...</p>;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError('');
    const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
    const d = await res.json();
    if (!res.ok) return setError(d.error || 'Failed');
    setS(d.data);
    setSaved(true);
  };

  const price = (k: keyof Settings['prices'], label: string) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input type="number" min={0} step="0.001" value={s.prices[k]} onChange={(e) => setS({ ...s, prices: { ...s.prices, [k]: Number(e.target.value) } })} className="w-full px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400" />
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{L('إعدادات المنصة', 'Platform settings')}</h1>
      <form onSubmit={save} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
        {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        {saved && <div className="p-3 bg-emerald-50 text-emerald-700 rounded text-sm">{L('تم الحفظ', 'Saved')}</div>}

        <section>
          <h2 className="font-bold text-slate-900 mb-1">{L('المهام التلقائية على مستوى المنصة', 'Platform-wide automatic jobs')}</h2>
          <p className="text-xs text-slate-500 mb-3">{L('تعمل يوميًا الساعة 7 صباحًا بتوقيت البحرين. إيقاف مهمة هنا يوقفها لكل الصالونات؛ ويمكن إيقافها لصالون واحد من صفحته في «الصالونات».', 'Run daily at 7 AM Bahrain time. Turning one off here stops it for every salon; you can also turn it off for a single salon from its page under Salons.')}</p>
          <div className="space-y-2">
            {([
              ['reports', L('التقارير الدورية بالبريد (جداول أصحاب الصالونات)', 'Scheduled email reports (owners)')],
              ['reminders', L('تذكير العملاء بمواعيدهم عبر واتساب', 'Appointment reminders to customers on WhatsApp')],
              ['winBack', L('رسائل «اشتقنا لك» عبر واتساب للعملاء المنقطعين (تسويقي — يُفعَّل بقرارك)', 'Win-back WhatsApp messages to lapsed clients (marketing — off until you enable)')],
            ] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-3 text-sm text-slate-800">
                <input type="checkbox" checked={s.automations[k]} onChange={(e) => setS({ ...s, automations: { ...s.automations, [k]: e.target.checked } })} className="h-4 w-4" />
                {label}
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-bold text-slate-900 mb-3">{L('الاشتراكات', 'Subscriptions')}</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">{L('مدة التجربة المجانية (أيام) للصالونات الجديدة', 'Free trial length (days) for new salons')}</label>
            <input type="number" min={0} max={365} value={s.trialDays} onChange={(e) => setS({ ...s, trialDays: Number(e.target.value) })} className="w-full px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {price('BASIC', L('سعر الأساسية (شهريًا)', 'Basic price / month'))}
            {price('PROFESSIONAL', L('سعر الاحترافية', 'Professional price'))}
            {price('ENTERPRISE', L('سعر المؤسسات', 'Enterprise price'))}
          </div>
        </section>

        <section>
          <h2 className="font-bold text-slate-900 mb-3">{L('إعلان لأصحاب الصالونات', 'Announcement to salon owners')}</h2>
          <label className="flex items-center gap-2 text-sm text-slate-700 mb-3">
            <input type="checkbox" checked={s.announcement.active} onChange={(e) => setS({ ...s, announcement: { ...s.announcement, active: e.target.checked } })} />
            {L('عرض الإعلان في لوحات الملاك', 'Show in owners’ dashboards')}
          </label>
          <textarea value={s.announcement.textAr} onChange={(e) => setS({ ...s, announcement: { ...s.announcement, textAr: e.target.value } })} rows={2} maxLength={500} placeholder="النص بالعربية" className="w-full px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 mb-2" />
          <textarea value={s.announcement.textEn} onChange={(e) => setS({ ...s, announcement: { ...s.announcement, textEn: e.target.value } })} rows={2} maxLength={500} dir="ltr" placeholder="English text" className="w-full px-3.5 min-h-11 py-2 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 text-left" />
        </section>

        <button className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm">{L('حفظ', 'Save')}</button>
      </form>
    </div>
  );
}

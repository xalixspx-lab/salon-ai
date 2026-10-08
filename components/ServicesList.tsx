import { Clock } from 'lucide-react';

interface ServiceRow {
  id: string;
  displayName: string;
  basePrice: number | null;
  baseDurationMinutes: number | null;
}

// قائمة أسعار الخدمات للعرض فقط: لا حجز من الموقع؛ التواصل عبر زر واتساب الصالون
export default function ServicesList({ services, currency, emptyText, minutesLabel }: { services: ServiceRow[]; currency: string; emptyText: string; minutesLabel: string }) {
  if (services.length === 0) return <p className="text-stone-400 text-sm py-4">{emptyText}</p>;
  return (
    <ul className="divide-y divide-stone-100">
      {services.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-3 py-3.5">
          <div className="min-w-0">
            <p className="font-medium text-stone-900">{s.displayName}</p>
            {s.baseDurationMinutes ? (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.8} /> {s.baseDurationMinutes} {minutesLabel}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 tabular-nums">{s.basePrice ? `${s.basePrice} ${currency}` : '—'}</span>
        </li>
      ))}
    </ul>
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

// بطاقة Metronic: خلفية بيضاء، حد ناعم، ظل خفيف جدًا
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]', className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-stone-100">
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-stone-900">{title}</h3>
        {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

// بطاقة مؤشر: رقم كبير + شارة تغيّر
export function StatCard({ label, value, delta, hint, icon }: { label: string; value: ReactNode; delta?: { value: string; up: boolean }; hint?: string; icon?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-stone-500">{label}</p>
        {icon && <span className="h-9 w-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        <span className="text-[28px] leading-none font-semibold text-stone-900 tabular-nums">{value}</span>
        {delta && (
          <span className={cn('text-xs font-medium rounded-md px-1.5 py-0.5', delta.up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
            {delta.up ? '▲' : '▼'} {delta.value}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-stone-400 mt-1.5">{hint}</p>}
    </Card>
  );
}

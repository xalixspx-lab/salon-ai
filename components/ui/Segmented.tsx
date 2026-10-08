'use client';

import { cn } from '@/components/ui/cn';

// تحكم مقسّم (بديل الراديو) لتبديل العرض/الفترة
export default function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-stone-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all', value === o.value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

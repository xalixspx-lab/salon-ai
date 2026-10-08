'use client';

import { cn } from '@/components/ui/cn';

// مفتاح تبديل (role=switch) بحركة ناعمة ويدعم RTL
export default function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 disabled:opacity-50', checked ? 'bg-brand-600' : 'bg-stone-300')}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-all duration-200', checked ? 'ms-[22px]' : 'ms-0.5')} />
    </button>
  );
}

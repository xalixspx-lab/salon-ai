import type { ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

const tones = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  red: 'bg-red-50 text-red-700 ring-red-100',
  blue: 'bg-sky-50 text-sky-700 ring-sky-100',
  gray: 'bg-stone-100 text-stone-600 ring-stone-200',
} as const;

export default function Badge({ tone = 'gray', children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>{children}</span>;
}

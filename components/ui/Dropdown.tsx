'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

export type MenuItem =
  | { type?: 'item'; label: string; href?: string; onSelect?: () => void; icon?: ReactNode; danger?: boolean }
  | { type: 'separator' }
  | { type: 'label'; label: string };

// قائمة منسدلة: Esc للإغلاق، أسهم للتنقل، نقر خارجي، وتتموضع حسب الاتجاه
export default function Dropdown({ trigger, items, align = 'end', width = 'w-56' }: { trigger: ReactNode; items: MenuItem[]; align?: 'start' | 'end'; width?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const els = [...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
        const i = els.indexOf(document.activeElement as HTMLElement);
        els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemCls = (danger?: boolean) =>
    cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-start transition-colors focus-visible:outline-none', danger ? 'text-red-600 hover:bg-red-50 focus:bg-red-50' : 'text-stone-700 hover:bg-stone-50 focus:bg-stone-50');

  return (
    <div ref={root} className="relative inline-block">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50">
        {trigger}
      </button>
      {open && (
        <div role="menu" className={cn('absolute z-50 mt-2 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg animate-[popIn_.14s_ease-out]', width, align === 'end' ? 'end-0' : 'start-0')}>
          {items.map((it, i) => {
            if (it.type === 'separator') return <div key={i} className="my-1 h-px bg-stone-100" />;
            if (it.type === 'label')
              return (
                <p key={i} className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                  {it.label}
                </p>
              );
            const inner = (
              <>
                {it.icon && <span className="text-stone-400 [&>svg]:h-4 [&>svg]:w-4">{it.icon}</span>}
                {it.label}
              </>
            );
            return it.href ? (
              <Link key={i} role="menuitem" href={it.href} onClick={() => setOpen(false)} className={itemCls(it.danger)}>
                {inner}
              </Link>
            ) : (
              <button
                key={i}
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  it.onSelect?.();
                }}
                className={itemCls(it.danger)}
              >
                {inner}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

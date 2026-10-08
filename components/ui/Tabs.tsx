'use client';

import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

export type TabItem = { id: string; label: string; content: ReactNode; count?: number };

// تبويبات بخط سفلي؛ تنقّل بالأسهم ولوحة المفاتيح
export default function Tabs({ items, initial }: { items: TabItem[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? items[0]?.id);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const dir = document.documentElement.dir === 'rtl' ? -1 : 1;
    let n = i;
    if (e.key === 'ArrowRight') n = i + dir;
    else if (e.key === 'ArrowLeft') n = i - dir;
    else return;
    n = (n + items.length) % items.length;
    setActive(items[n].id);
    (e.currentTarget.parentElement?.children[n] as HTMLElement | undefined)?.focus();
  };
  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {items.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn('relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:bg-stone-50', active === t.id ? 'text-brand-700' : 'text-stone-500 hover:text-stone-800')}
          >
            {t.label}
            {t.count !== undefined && <span className="ms-1.5 rounded-full bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600">{t.count}</span>}
            <span className={cn('absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600 transition-opacity', active === t.id ? 'opacity-100' : 'opacity-0')} />
          </button>
        ))}
      </div>
      {items.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={active !== t.id} className="pt-5">
          {active === t.id && t.content}
        </div>
      ))}
    </div>
  );
}

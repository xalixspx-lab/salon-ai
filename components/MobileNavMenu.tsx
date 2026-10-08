'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Compass, LogIn, Menu, Route, Sparkles, X } from 'lucide-react';
import { buttonClass } from '@/components/ui/Button';

// قائمة جوال منسدلة للهيدر العام (تحت sm فقط)
export default function MobileNavMenu({
  locale,
  labels,
}: {
  locale: string;
  labels: { features: string; how: string; directory: string; login: string; register: string; menu: string };
}) {
  const [open, setOpen] = useState(false);
  const item = 'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-stone-700 hover:bg-stone-50';
  const close = () => setOpen(false);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={labels.menu} aria-expanded={open} className="h-10 w-10 -m-1 rounded-xl flex items-center justify-center text-stone-700 hover:bg-stone-100">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute end-0 top-full mt-2 w-60 bg-white rounded-2xl border border-stone-200 shadow-xl z-50 p-1.5 text-sm animate-[popIn_.14s_ease-out]">
            <Link href={`/${locale}#features`} onClick={close} className={item}>
              <Sparkles className="h-4 w-4 text-stone-400" /> {labels.features}
            </Link>
            <Link href={`/${locale}#how`} onClick={close} className={item}>
              <Route className="h-4 w-4 text-stone-400" /> {labels.how}
            </Link>
            <Link href={`/${locale}/salons`} onClick={close} className={item}>
              <Compass className="h-4 w-4 text-stone-400" /> {labels.directory}
            </Link>
            <div className="my-1 h-px bg-stone-100" />
            <Link href={`/${locale}/login`} onClick={close} className={item}>
              <LogIn className="h-4 w-4 text-stone-400" /> {labels.login}
            </Link>
            <Link href={`/${locale}/salons/new`} onClick={close} className={buttonClass('primary', 'md', 'w-full mt-1')}>
              {labels.register}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

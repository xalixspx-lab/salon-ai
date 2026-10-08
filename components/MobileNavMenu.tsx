'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Compass, Menu, Store, UserRound, X } from 'lucide-react';
import LogoutButton from '@/components/account/LogoutButton';
import { buttonClass } from '@/components/ui/Button';

// قائمة جوال منسدلة للهيدر العام (تحت sm فقط)
export default function MobileNavMenu({
  locale,
  loggedIn,
  name,
  labels,
}: {
  locale: string;
  loggedIn: boolean;
  name?: string;
  labels: { discover: string; login: string; register: string; account: string; forOwners?: string };
}) {
  const [open, setOpen] = useState(false);
  const item = 'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-stone-700 hover:bg-stone-50';

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open} className="h-10 w-10 -m-1 rounded-xl flex items-center justify-center text-stone-700 hover:bg-stone-100">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-full mt-2 w-60 bg-white rounded-2xl border border-stone-200 shadow-xl z-50 p-1.5 text-sm animate-[popIn_.14s_ease-out]">
            <Link href={`/${locale}/salons`} onClick={() => setOpen(false)} className={item}>
              <Compass className="h-4 w-4 text-stone-400" /> {labels.discover}
            </Link>
            {labels.forOwners && (
              <Link href={`/${locale}/salons/new`} onClick={() => setOpen(false)} className={item}>
                <Store className="h-4 w-4 text-stone-400" /> {labels.forOwners}
              </Link>
            )}
            <div className="my-1 h-px bg-stone-100" />
            {loggedIn ? (
              <>
                <Link href={`/${locale}/account`} onClick={() => setOpen(false)} className={`${item} font-medium`}>
                  <UserRound className="h-4 w-4 text-stone-400" /> {name || labels.account}
                </Link>
                <div className="px-3 py-2.5">
                  <LogoutButton />
                </div>
              </>
            ) : (
              <>
                <Link href={`/${locale}/account/login`} onClick={() => setOpen(false)} className={item}>
                  <UserRound className="h-4 w-4 text-stone-400" /> {labels.login}
                </Link>
                <Link href={`/${locale}/account/register`} onClick={() => setOpen(false)} className={buttonClass('primary', 'md', 'w-full mt-1')}>
                  {labels.register}
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

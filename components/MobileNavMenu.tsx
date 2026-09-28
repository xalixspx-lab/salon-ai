'use client';

import { useState } from 'react';
import Link from 'next/link';
import LogoutButton from '@/components/account/LogoutButton';

// قائمة جوال منسدلة للهيدر العام: تظهر فقط تحت sm (حيث يضيق الصف الأفقي
// المعتاد عن استيعاب كل الروابط)، بديل الرابط الرئيسي عندما تكبر عناصر
// التنقل (دخول/تسجيل أو الاسم/خروج + اكتشف + روابط لاحقة كالإحالة).
export default function MobileNavMenu({
  locale,
  loggedIn,
  name,
  labels,
}: {
  locale: string;
  loggedIn: boolean;
  name?: string;
  labels: { discover: string; login: string; register: string; account: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className="p-2 -m-2 text-gray-700 hover:text-gray-900"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-lg z-50 p-2 text-sm">
            <Link
              href={`/${locale}/salons`}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50"
            >
              {labels.discover}
            </Link>
            {loggedIn ? (
              <>
                <Link
                  href={`/${locale}/account`}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 font-medium"
                >
                  {name || labels.account}
                </Link>
                <div className="px-3 py-2.5">
                  <LogoutButton />
                </div>
              </>
            ) : (
              <>
                <Link
                  href={`/${locale}/account/login`}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50"
                >
                  {labels.login}
                </Link>
                <Link
                  href={`/${locale}/account/register`}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 rounded-xl bg-gray-900 text-white text-center font-medium hover:bg-gray-800 mt-1"
                >
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

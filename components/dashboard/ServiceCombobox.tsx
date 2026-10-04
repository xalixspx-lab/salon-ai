'use client';

import { useMemo, useRef, useState } from 'react';
import { SERVICE_CATALOG, SERVICE_CATEGORIES } from '@/lib/serviceCatalog';

export default function ServiceCombobox({
  locale,
  nameAr,
  nameEn,
  onChange,
}: {
  locale: string;
  nameAr: string;
  nameEn: string;
  onChange: (ar: string, en: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SERVICE_CATALOG;
    return SERVICE_CATALOG.filter(
      (s) => s.ar.toLowerCase().includes(q) || s.en.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof SERVICE_CATALOG>();
    for (const item of filtered) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return map;
  }, [filtered]);

  const selectItem = (ar: string, en: string) => {
    onChange(ar, en);
    setOpen(false);
    setQuery('');
  };

  const currentLabel = locale === 'ar' ? nameAr : nameEn;

  if (customMode) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{locale === 'ar' ? 'اسم الخدمة (عربي)' : 'Service name (Arabic)'}</label>
          <input
            value={nameAr}
            onChange={(e) => onChange(e.target.value, nameEn)}
            required
            className="w-full px-3 py-2 border rounded-md text-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Service name (English)</label>
          <input
            value={nameEn}
            onChange={(e) => onChange(nameAr, e.target.value)}
            required
            dir="ltr"
            className="w-full px-3 py-2 border rounded-md text-black"
          />
          <button
            type="button"
            onClick={() => { setCustomMode(false); onChange('', ''); }}
            className="text-xs text-brand-600 hover:underline mt-1"
          >
            {locale === 'ar' ? '← اختيار من القائمة بدلًا من ذلك' : '← Pick from the list instead'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative sm:col-span-2" ref={wrapRef}>
      <label className="block text-sm font-medium text-stone-700 mb-1">
        {locale === 'ar' ? 'اسم الخدمة' : 'Service name'}
      </label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 border rounded-md text-black text-right bg-white flex items-center justify-between"
      >
        <span className={currentLabel ? 'text-black' : 'text-stone-400'}>
          {currentLabel || (locale === 'ar' ? 'اختر خدمة...' : 'Select a service...')}
        </span>
        <span className="text-stone-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-stone-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
          <div className="p-2 sticky top-0 bg-white border-b border-stone-100">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={locale === 'ar' ? 'ابحث عن خدمة...' : 'Search a service...'}
              className="w-full px-3 py-1.5 border rounded-md text-black text-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => { setCustomMode(true); setOpen(false); }}
            className="w-full text-right px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 border-b border-stone-100"
          >
            ✎ {locale === 'ar' ? 'خدمة مخصصة (إدخال يدوي)' : 'Custom service (manual entry)'}
          </button>

          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-stone-400">
              {locale === 'ar' ? 'لا توجد نتائج' : 'No results'}
            </p>
          ) : (
            SERVICE_CATEGORIES.map((cat) => {
              const items = grouped.get(cat.key);
              if (!items || items.length === 0) return null;
              return (
                <div key={cat.key}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-stone-500 bg-stone-50">
                    {cat.icon} {locale === 'ar' ? cat.labelAr : cat.labelEn}
                  </div>
                  {items.map((item) => (
                    <button
                      key={item.ar}
                      type="button"
                      onClick={() => selectItem(item.ar, item.en)}
                      className="w-full text-right px-4 py-2 text-sm text-stone-700 hover:bg-brand-50"
                    >
                      {locale === 'ar' ? item.ar : item.en}
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

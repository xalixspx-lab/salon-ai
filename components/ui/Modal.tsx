'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

// نافذة حوار: Esc للإغلاق، قفل التمرير، تركيز تلقائي؛ على الجوال تظهر كورقة سفلية
export default function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-[2px] animate-[fadeIn_.15s_ease-out]" onClick={onClose} />
      <div ref={panel} tabIndex={-1} className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl focus:outline-none animate-[popIn_.18s_ease-out] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          <button onClick={onClose} aria-label="close" className="h-8 w-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 text-sm text-stone-600">{children}</div>
        {footer && <div className="px-5 pb-5 pt-1 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

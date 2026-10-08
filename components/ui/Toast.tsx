'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
type ToastItem = { id: number; tone: Tone; text: string };
const Ctx = createContext<(text: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(Ctx);

const icons = { success: CheckCircle2, error: XCircle, info: Info };
const colors = { success: 'text-emerald-400', error: 'text-red-400', info: 'text-sky-400' };

// إشعارات منبثقة تختفي تلقائيًا؛ ضعها مرة واحدة حول التطبيق واستخدم useToast()
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l, { id, tone, text }].slice(-3));
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed z-[70] bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 inset-x-0 flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
        {items.map((t) => {
          const I = icons[t.tone];
          return (
            <div key={t.id} className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-stone-900 text-white text-sm px-4 py-3 shadow-xl animate-[popIn_.18s_ease-out] max-w-sm">
              <I className={`h-[18px] w-[18px] shrink-0 ${colors[t.tone]}`} />
              {t.text}
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

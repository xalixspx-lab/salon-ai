'use client';

import { useEffect, useRef } from 'react';

// يستدعي fn فورًا ثم كل ms مللي ثانية، ويتوقف أثناء إخفاء التبويب/التطبيق
// (توفير بطارية وبيانات على الجوال) ويستأنف فور العودة. أخطاء الشبكة تُبتلع
// حتى لا تتحول لـ unhandled rejection في كل دورة.
export function usePolling(fn: () => Promise<void>, ms: number, enabled = true) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      if (document.hidden) return;
      fnRef.current().catch(() => {});
    };
    const start = () => {
      tick();
      timer = setInterval(tick, ms);
    };
    const onVisibility = () => {
      if (document.hidden) {
        if (timer) clearInterval(timer);
        timer = undefined;
      } else if (!timer) {
        start();
      }
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ms, enabled]);
}

// JSON آمن: استجابة 401/500 غير JSON لا ترمي استثناءً
export async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T | null }> {
  try {
    const res = await fetch(url, init);
    const json = await res.json().catch(() => null);
    return { ok: res.ok && Boolean(json?.success), data: (json?.data ?? null) as T | null };
  } catch {
    return { ok: false, data: null };
  }
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import ChatThread, { type ChatMessage } from '@/components/chat/ChatThread';
import { fetchJson, usePolling } from '@/components/chat/usePolling';

// ويدجت محادثة عائم في صفحة الصالون العامة — محادثة واحدة مع هذا الصالون
// تحديدًا؛ يظهر كاملًا لعميل مسجّل دخوله، ولغيره رابط تسجيل الدخول فقط.
// شارة غير المقروء تعمل والويدجت مغلق (استطلاع خفيف كل 15 ثانية).
export default function SalonChatWidget({ tenantId }: { tenantId: string }) {
  const t = useTranslations('Chat');
  const locale = useLocale();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch('/api/account/session')
      .then((r) => r.json())
      .then((json) => setLoggedIn(Boolean(json?.loggedIn)))
      .catch(() => setLoggedIn(false));
  }, []);

  const loadMessages = useCallback(async () => {
    const { ok, data } = await fetchJson<ChatMessage[]>(`/api/account/conversations/${tenantId}/messages`);
    if (ok && data) {
      setMessages(data);
      setUnread(0);
    }
  }, [tenantId]);

  const loadUnread = useCallback(async () => {
    const { ok, data } = await fetchJson<{ unread: number }>(`/api/account/conversations/${tenantId}/unread`);
    if (ok && data) setUnread(data.unread);
  }, [tenantId]);

  usePolling(loadMessages, 3000, loggedIn === true && open);
  usePolling(loadUnread, 15000, loggedIn === true && !open);

  const sendCustomerMessage = async (text: string) => {
    const { ok, data } = await fetchJson<ChatMessage>(`/api/account/conversations/${tenantId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    });
    if (ok && data) setMessages((prev) => [...prev, data]);
    return ok;
  };

  if (loggedIn === null) return null;

  if (!loggedIn) {
    return (
      <a
        href={`/${locale}/account/login`}
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] end-4 z-40 rounded-full bg-white border border-gray-200 shadow-lg px-4 py-3 text-sm font-medium text-gray-700 hover:border-gray-300"
      >
        💬 {t('loginToChat')}
      </a>
    );
  }

  return (
    <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] end-4 md:end-6 z-40">
      {open && (
        <div className="mb-3 w-[calc(100vw-2rem)] max-w-sm h-[min(26rem,calc(100dvh-8rem))] bg-white rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 font-bold text-gray-800">{t('chatWithSalon')}</div>
          <ChatThread
            messages={messages}
            mineRole="CUSTOMER"
            locale={locale}
            placeholder={t('typePlaceholder')}
            sendLabel={t('send')}
            emptyLabel={t('noMessages')}
            onSend={sendCustomerMessage}
          />
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-14 w-14 rounded-full bg-brand-600 text-white shadow-xl flex items-center justify-center text-2xl hover:bg-brand-700 transition"
        aria-label={t('chatWithSalon')}
        aria-expanded={open}
      >
        💬
        {!open && unread > 0 && (
          <span className="absolute -top-1 -end-1 bg-gold-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}

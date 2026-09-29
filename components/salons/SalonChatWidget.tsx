'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

type Message = { id: string; senderRole: string; body: string; createdAt: string };

// ويدجت محادثة عائم في صفحة الصالون العامة — محادثة واحدة مع هذا الصالون
// تحديدًا (لا بريد وارد متعدد كجانب المالك)؛ يظهر فقط لعميل مسجّل دخوله
export default function SalonChatWidget({ tenantId }: { tenantId: string }) {
  const t = useTranslations('Chat');
  const locale = useLocale();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/account/session')
      .then((r) => r.json())
      .then((d) => setLoggedIn(Boolean(d?.loggedIn)))
      .catch(() => setLoggedIn(false));
  }, []);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/account/conversations/${tenantId}/messages`);
    const data = await res.json();
    if (data.success) setMessages(data.data);
  }, [tenantId]);

  useEffect(() => {
    if (!open) return;
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [open, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    const res = await fetch(`/api/account/conversations/${tenantId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    });
    const data = await res.json();
    if (data.success) setMessages((prev) => [...prev, data.data]);
    setSending(false);
  };

  if (loggedIn === null) return null;

  if (!loggedIn) {
    return (
      <a
        href={`/${locale}/account/login`}
        className="fixed bottom-6 end-6 z-40 rounded-full bg-white border border-gray-200 shadow-lg px-4 py-3 text-sm font-medium text-gray-700 hover:border-gray-300"
      >
        💬 {t('loginToChat')}
      </a>
    );
  }

  return (
    <div className="fixed bottom-6 end-6 z-40">
      {open && (
        <div className="mb-3 w-[calc(100vw-2rem)] max-w-sm h-[26rem] bg-white rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 font-bold text-gray-800">{t('chatWithSalon')}</div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
            {messages.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">{t('noMessages')}</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.senderRole === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      m.senderRole === 'CUSTOMER' ? 'bg-brand-600 text-white' : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-2 border-t border-gray-100 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('typePlaceholder')}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="bg-brand-600 text-white rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-40"
            >
              {t('send')}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="h-14 w-14 rounded-full bg-brand-600 text-white shadow-xl flex items-center justify-center text-2xl hover:bg-brand-700 transition"
        aria-label={t('chatWithSalon')}
      >
        💬
      </button>
    </div>
  );
}

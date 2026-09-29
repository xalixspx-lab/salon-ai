'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

type ConversationSummary = {
  id: string;
  customerName: string;
  lastMessage: { body: string; senderRole: string; createdAt: string } | null;
  lastMessageAt: string;
  unreadCount: number;
};

type Message = { id: string; senderRole: string; body: string; createdAt: string };
type EligibleClient = { id: string; name: string; phone: string | null; hasAccount: boolean };

// ويدجت محادثة عائم فوق كل صفحات لوحة التحكم — بريد وارد يضم محادثة مستقلة
// لكل عميل يراسل الصالون في آن واحد (لا محادثة واحدة مشتركة). يستطلع القائمة
// دوريًا لتحديث الشارة والمحادثة المفتوحة (إن وُجدت) بفاصل أقصر لإحساس شبه
// لحظي دون الحاجة لبنية WebSocket جديدة على استضافة بلا اتصالات دائمة
export default function ChatWidget() {
  const t = useTranslations('Chat');
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [eligibleClients, setEligibleClients] = useState<EligibleClient[] | null>(null);
  const [starting, setStarting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/dashboard/conversations');
    const data = await res.json();
    if (data.success) setConversations(data.data);
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    const res = await fetch(`/api/dashboard/conversations/${id}/messages`);
    const data = await res.json();
    if (data.success) setMessages(data.data);
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 8000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    const interval = setInterval(() => loadMessages(activeId), 2500);
    return () => clearInterval(interval);
  }, [activeId, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const openConversation = async (id: string) => {
    setActiveId(id);
    await fetch(`/api/dashboard/conversations/${id}/read`, { method: 'POST' });
    loadConversations();
  };

  const openPicker = async () => {
    setPickerOpen(true);
    const res = await fetch('/api/dashboard/clients');
    const data = await res.json();
    if (data.success) setEligibleClients(data.data.filter((c: EligibleClient) => c.hasAccount));
  };

  const startConversation = async (customerId: string) => {
    if (starting) return;
    setStarting(true);
    const res = await fetch('/api/dashboard/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId }),
    });
    const data = await res.json();
    setStarting(false);
    if (data.success) {
      setPickerOpen(false);
      await loadConversations();
      openConversation(data.data.id);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    setInput('');
    const res = await fetch(`/api/dashboard/conversations/${activeId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    });
    const data = await res.json();
    if (data.success) setMessages((prev) => [...prev, data.data]);
    setSending(false);
    loadConversations();
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const active = conversations.find((c) => c.id === activeId);

  // bottom-20: يعلو فوق شريط التنقل السفلي للجوال (fixed bottom-0) حتى لا
  // يتراكب معه، بنفس درس التراكبات من الجولات السابقة
  return (
    <div className="fixed bottom-20 end-4 md:bottom-6 md:end-6 z-40">
      {open && (
        <div className="mb-3 w-[calc(100vw-2rem)] max-w-sm h-[28rem] bg-white rounded-2xl border border-stone-200 shadow-2xl flex flex-col overflow-hidden">
          {pickerOpen ? (
            <>
              <div className="px-3 py-3 border-b border-stone-100 flex items-center gap-2">
                <button onClick={() => setPickerOpen(false)} className="text-stone-500 hover:text-stone-800 text-sm px-1">
                  ← {t('back')}
                </button>
                <span className="font-bold text-stone-800 text-sm truncate">{t('newConversation')}</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <p className="text-xs text-stone-500 px-4 pt-3 pb-1">{t('selectCustomer')}</p>
                {eligibleClients === null ? (
                  <p className="text-center text-stone-400 text-sm py-10">…</p>
                ) : eligibleClients.length === 0 ? (
                  <p className="text-center text-stone-400 text-sm py-10">{t('noEligibleCustomers')}</p>
                ) : (
                  eligibleClients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => startConversation(c.id)}
                      disabled={starting}
                      className="w-full text-start px-4 py-3 border-b border-stone-50 hover:bg-stone-50 disabled:opacity-50"
                    >
                      <p className="font-semibold text-stone-800 text-sm truncate">{c.name}</p>
                      {c.phone && <p className="text-xs text-stone-500 truncate mt-0.5" dir="ltr">{c.phone}</p>}
                    </button>
                  ))
                )}
              </div>
            </>
          ) : !activeId ? (
            <>
              <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                <span className="font-bold text-stone-800">{t('conversations')}</span>
                <button onClick={openPicker} className="h-7 w-7 rounded-full bg-brand-50 text-brand-700 text-lg leading-none flex items-center justify-center hover:bg-brand-100" aria-label={t('newConversation')}>
                  +
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <p className="text-center text-stone-400 text-sm py-10">{t('noConversations')}</p>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => openConversation(c.id)}
                      className="w-full text-start px-4 py-3 border-b border-stone-50 hover:bg-stone-50 flex items-start gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-800 text-sm truncate">{c.customerName}</p>
                        {c.lastMessage && (
                          <p className="text-xs text-stone-500 truncate mt-0.5">{c.lastMessage.body}</p>
                        )}
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="shrink-0 bg-brand-600 text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                          {c.unreadCount}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="px-3 py-3 border-b border-stone-100 flex items-center gap-2">
                <button onClick={() => setActiveId(null)} className="text-stone-500 hover:text-stone-800 text-sm px-1">
                  ← {t('back')}
                </button>
                <span className="font-bold text-stone-800 text-sm truncate">{active?.customerName}</span>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-stone-50">
                {messages.length === 0 ? (
                  <p className="text-center text-stone-400 text-sm py-10">{t('noMessages')}</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.senderRole === 'OWNER' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                          m.senderRole === 'OWNER' ? 'bg-brand-600 text-white' : 'bg-white text-stone-800 border border-stone-200'
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-stone-100 flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={t('typePlaceholder')}
                  className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="bg-brand-600 text-white rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-40"
                >
                  {t('send')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-14 w-14 rounded-full bg-brand-600 text-white shadow-xl flex items-center justify-center text-2xl hover:bg-brand-700 transition"
        aria-label={t('conversations')}
      >
        💬
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -end-1 bg-gold-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
            {totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}

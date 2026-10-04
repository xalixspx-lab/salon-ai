'use client';

import { useCallback, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import ChatThread, { type ChatMessage } from '@/components/chat/ChatThread';
import { fetchJson, usePolling } from '@/components/chat/usePolling';

type ConversationSummary = {
  id: string;
  customerName: string;
  lastMessage: { body: string; senderRole: string; createdAt: string } | null;
  lastMessageAt: string;
  blockedByCustomer: boolean;
  unreadCount: number;
};

type EligibleClient = { id: string; name: string; phone: string | null; hasAccount: boolean };

// ويدجت محادثة عائم فوق كل صفحات لوحة التحكم — بريد وارد يضم محادثة مستقلة
// لكل عميل يراسل الصالون في آن واحد. يستطلع القائمة دوريًا لتحديث الشارة،
// والمحادثة المفتوحة بفاصل أقصر لإحساس شبه لحظي، ويتوقف أثناء إخفاء التبويب.
export default function ChatWidget() {
  const t = useTranslations('Chat');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [eligibleClients, setEligibleClients] = useState<EligibleClient[] | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const lastReadMarker = useRef<string | null>(null);

  const loadConversations = useCallback(async () => {
    const { ok, data } = await fetchJson<ConversationSummary[]>('/api/dashboard/conversations');
    if (ok && data) setConversations(data);
  }, []);

  const markRead = useCallback(
    async (id: string) => {
      await fetch(`/api/dashboard/conversations/${id}/read`, { method: 'POST' }).catch(() => {});
      loadConversations();
    },
    [loadConversations]
  );

  const loadMessages = useCallback(
    async (id: string) => {
      const { ok, data } = await fetchJson<ChatMessage[]>(`/api/dashboard/conversations/${id}/messages`);
      if (!ok || !data) return;
      setMessages(data);
      // رسالة عميل جديدة وصلت والمحادثة مفتوحة أمام المالك → تُحسب مقروءة فورًا
      const last = data[data.length - 1];
      if (last && last.senderRole === 'CUSTOMER' && lastReadMarker.current !== last.id) {
        lastReadMarker.current = last.id;
        markRead(id);
      }
    },
    [markRead]
  );

  usePolling(loadConversations, 8000);
  usePolling(() => (activeId ? loadMessages(activeId) : Promise.resolve()), 2500, Boolean(activeId) && open);

  const openConversation = (id: string) => {
    lastReadMarker.current = null;
    setMessages([]);
    setActiveId(id);
  };

  const closeConversation = () => {
    setActiveId(null);
    setMessages([]);
    loadConversations();
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setStartError(false);
    const { ok, data } = await fetchJson<EligibleClient[]>('/api/dashboard/clients');
    if (ok && data) setEligibleClients(data.filter((c) => c.hasAccount));
    else setEligibleClients([]);
  };

  const startConversation = async (customerId: string) => {
    if (starting) return;
    setStarting(true);
    setStartError(false);
    const { ok, data } = await fetchJson<{ id: string }>('/api/dashboard/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId }),
    });
    setStarting(false);
    if (ok && data) {
      setPickerOpen(false);
      await loadConversations();
      openConversation(data.id);
    } else {
      setStartError(true);
    }
  };

  const sendOwnerMessage = async (text: string) => {
    if (!activeId) return false;
    const { ok, data } = await fetchJson<ChatMessage>(`/api/dashboard/conversations/${activeId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    });
    if (ok && data) {
      setMessages((prev) => [...prev, data]);
      loadConversations();
    }
    return ok;
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const active = conversations.find((c) => c.id === activeId);

  // يعلو فوق شريط التنقل السفلي للجوال (fixed bottom-0) وفوق شريط الإيماءات
  // في iOS (safe-area) حتى لا يتراكب معهما
  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] end-4 md:bottom-6 md:end-6 z-40">
      {open && (
        <div className="mb-3 w-[calc(100vw-2rem)] max-w-sm h-[min(28rem,calc(100dvh-10rem))] bg-white rounded-2xl border border-stone-200 shadow-2xl flex flex-col overflow-hidden">
          {pickerOpen ? (
            <>
              <div className="px-3 py-3 border-b border-stone-100 flex items-center gap-2">
                <button onClick={() => setPickerOpen(false)} className="text-stone-500 hover:text-stone-800 text-sm px-2 py-1">
                  ← {t('back')}
                </button>
                <span className="font-bold text-stone-800 text-sm truncate">{t('newConversation')}</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <p className="text-xs text-stone-500 px-4 pt-3 pb-1">{t('selectCustomer')}</p>
                {startError && <p className="text-xs text-red-600 px-4 py-1">{t('startFailed')}</p>}
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
                      {c.phone && (
                        <p className="text-xs text-stone-500 truncate mt-0.5" dir="ltr">
                          {c.phone}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          ) : !activeId ? (
            <>
              <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                <span className="font-bold text-stone-800">{t('conversations')}</span>
                <button
                  onClick={openPicker}
                  className="h-9 w-9 rounded-full bg-brand-50 text-brand-700 text-xl leading-none flex items-center justify-center hover:bg-brand-100"
                  aria-label={t('newConversation')}
                >
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
                        {c.lastMessage && <p className="text-xs text-stone-500 truncate mt-0.5">{c.lastMessage.body}</p>}
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
                <button onClick={closeConversation} className="text-stone-500 hover:text-stone-800 text-sm px-2 py-1">
                  ← {t('back')}
                </button>
                <span className="font-bold text-stone-800 text-sm truncate">{active?.customerName}</span>
              </div>
              <ChatThread
                messages={messages}
                mineRole="OWNER"
                locale={locale}
                placeholder={t('typePlaceholder')}
                sendLabel={t('send')}
                emptyLabel={t('noMessages')}
                onSend={sendOwnerMessage}
                lockedNotice={active?.blockedByCustomer ? t('blockedByCustomerNotice') : undefined}
              />
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-14 w-14 rounded-full bg-brand-600 text-white shadow-xl flex items-center justify-center text-2xl hover:bg-brand-700 transition"
        aria-label={t('conversations')}
        aria-expanded={open}
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

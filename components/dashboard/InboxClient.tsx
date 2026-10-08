'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import ChatThread, { type ChatMessage } from '@/components/chat/ChatThread';
import { fetchJson, usePolling } from '@/components/chat/usePolling';

type Conversation = {
  id: string;
  customerName: string;
  channel: 'whatsapp' | 'web';
  phone: string | null;
  windowOpen: boolean;
  mode: string;
  lastMessage: { body: string; senderRole: string; createdAt: string } | null;
  lastMessageAt: string;
  unreadCount: number;
};

// صندوق رسائل المالك (صفحة كاملة): قائمة المحادثات + الخيط. على الجوال شاشة واحدة
// في كل مرة (قائمة ثم خيط)، وعلى الحاسوب شاشتان متجاورتان.
export default function InboxClient() {
  const t = useTranslations('Inbox');
  const chat = useTranslations('Chat');
  const locale = useLocale();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [wa, setWa] = useState<{ connected: boolean; displayPhone: string | null } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [query, setQuery] = useState('');
  const [sendError, setSendError] = useState('');
  const lastReadMarker = useRef<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // الارتفاع = ما بين أعلى البطاقة وأعلى الشريط السفلي (أو أسفل الشاشة على الحاسوب).
  // ارتفاع ثابت بالـrem كان يدفع شريط الكتابة خلف شريط التنقل السفلي على الجوال
  const fit = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    const nav = document.querySelector<HTMLElement>('nav.fixed.bottom-0');
    const navH = nav && getComputedStyle(nav).display !== 'none' ? nav.offsetHeight : 0;
    const top = el.getBoundingClientRect().top;
    el.style.height = Math.max(320, window.innerHeight - top - navH - 16) + 'px';
  }, []);

  const loadList = useCallback(async () => {
    const { ok, data } = await fetchJson<Conversation[]>('/api/dashboard/conversations');
    if (ok && data) setConversations(data);
  }, []);

  const loadWa = useCallback(async () => {
    const { ok, data } = await fetchJson<{ connected: boolean; displayPhone: string | null }>('/api/dashboard/whatsapp');
    if (ok && data) setWa(data);
  }, []);

  const markRead = useCallback(
    async (id: string) => {
      await fetch(`/api/dashboard/conversations/${id}/read`, { method: 'POST' }).catch(() => {});
      loadList();
    },
    [loadList]
  );

  const loadThread = useCallback(
    async (id: string) => {
      const { ok, data } = await fetchJson<ChatMessage[]>(`/api/dashboard/conversations/${id}/messages`);
      if (!ok || !data) return;
      setMessages(data);
      const last = data[data.length - 1];
      if (last && last.senderRole === 'CUSTOMER' && lastReadMarker.current !== last.id) {
        lastReadMarker.current = last.id;
        markRead(id);
      }
    },
    [markRead]
  );

  usePolling(loadList, 5000);
  usePolling(loadWa, 60000);
  usePolling(() => (activeId ? loadThread(activeId) : Promise.resolve()), 2500, Boolean(activeId));

  const open = (id: string) => {
    lastReadMarker.current = null;
    setMessages([]);
    setSendError('');
    setActiveId(id);
  };

  const active = conversations?.find((c) => c.id === activeId) ?? null;

  useLayoutEffect(() => {
    fit();
  }, [fit, wa, conversations === null]);
  useEffect(() => {
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (conversations ?? []).filter((c) => {
      if (filter === 'unread' && c.unreadCount === 0) return false;
      if (!q) return true;
      return c.customerName.toLowerCase().includes(q) || (c.phone ?? '').includes(q.replace(/\D/g, '') || '\u0000');
    });
  }, [conversations, filter, query]);

  const errText = (code: string) =>
    code === 'WINDOW_CLOSED' ? t('errWindow') : code === 'NOT_CONNECTED' ? t('errNotConnected') : code === 'TOKEN_INVALID' ? t('errToken') : t('errFailed');

  const send = async (text: string) => {
    if (!activeId) return false;
    setSendError('');
    const res = await fetch(`/api/dashboard/conversations/${activeId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (res?.ok && json?.success) {
      setMessages((prev) => [...prev, json.data]);
      loadList();
      return true;
    }
    setSendError(errText(json?.code ?? ''));
    return false;
  };

  const timeFmt = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ar-BH', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', calendar: 'gregory' });

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-4">{t('title')}</h1>

      {wa && !wa.connected && (
        <div className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <p className="font-bold mb-1">{t('notConnectedTitle')}</p>
          <p>{t('notConnectedDesc')}</p>
        </div>
      )}
      {wa?.connected && wa.displayPhone && (
        <p className="mb-3 text-xs text-stone-500">
          🟢 {t('connectedAs')}: <span dir="ltr">{wa.displayPhone}</span>
        </p>
      )}

      <div ref={boxRef} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex h-[26rem]">
        {/* القائمة */}
        <div className={`${activeId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 md:border-e border-stone-200 shrink-0`}>
          <div className="p-3 border-b border-stone-100 space-y-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search')}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400"
            />
            <div className="flex gap-2">
              {(['all', 'unread'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === f ? 'bg-brand-600 text-white' : 'bg-stone-100 text-stone-600'}`}
                >
                  {t(f)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations === null ? (
              <p className="text-center text-stone-400 text-sm py-10">…</p>
            ) : visible.length === 0 ? (
              <p className="text-center text-stone-400 text-sm py-10">{t('empty')}</p>
            ) : (
              visible.map((c) => (
                <button
                  key={c.id}
                  onClick={() => open(c.id)}
                  className={`w-full text-start px-4 py-3 border-b border-stone-50 hover:bg-stone-50 flex items-start gap-2 ${c.id === activeId ? 'bg-brand-50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-stone-800 text-sm truncate">{c.customerName}</p>
                      {c.channel === 'whatsapp' && <span title={t('whatsapp')} aria-label={t('whatsapp')} className="text-xs">🟢</span>}
                    </div>
                    {c.lastMessage && <p className="text-xs text-stone-500 truncate mt-0.5">{c.lastMessage.body}</p>}
                    <p className="text-[10px] text-stone-400 mt-0.5">{timeFmt.format(new Date(c.lastMessageAt))}</p>
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
        </div>

        {/* الخيط */}
        <div className={`${activeId ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0`}>
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">{t('selectChat')}</div>
          ) : (
            <>
              <div className="px-3 py-3 border-b border-stone-100 flex items-center gap-2">
                <button onClick={() => setActiveId(null)} className="md:hidden text-stone-500 text-sm px-2 py-1">
                  ← {t('back')}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-stone-800 text-sm truncate">{active.customerName}</p>
                  {active.phone && (
                    <p className="text-xs text-stone-500" dir="ltr">
                      +{active.phone}
                    </p>
                  )}
                </div>
                {active.channel === 'whatsapp' && (
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${active.windowOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                    {active.windowOpen ? t('windowOpen') : t('windowClosed')}
                  </span>
                )}
              </div>
              {sendError && <div className="px-3 py-2 text-xs bg-red-50 text-red-700 border-b border-red-100">{sendError}</div>}
              <ChatThread
                messages={messages}
                mineRole="OWNER"
                locale={locale}
                placeholder={chat('typePlaceholder')}
                sendLabel={chat('send')}
                emptyLabel={t('empty')}
                onSend={send}
                lockedNotice={active.channel === 'whatsapp' && !active.windowOpen ? t('windowClosedNotice') : undefined}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

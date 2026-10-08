'use client';

import { useEffect, useRef, useState } from 'react';

export type ChatMessage = { id: string; senderRole: string; body: string; createdAt: string; status?: string | null; msgType?: string };

// علامات تسليم واتساب لرسائلنا الصادرة
function ticks(status?: string | null): { text: string; cls: string } | null {
  if (status === 'sent') return { text: '✓', cls: '' };
  if (status === 'delivered') return { text: '✓✓', cls: '' };
  if (status === 'read') return { text: '✓✓', cls: 'text-sky-300' };
  if (status === 'failed') return { text: '⚠', cls: 'text-red-300' };
  return null;
}

// منطقة الرسائل + شريط الإدخال، مشتركة بين ويدجت المالك وويدجت العميل.
// mineRole: دور الطرف الحالي (رسائله على الجهة الأخرى بلون العلامة).
export default function ChatThread({
  messages,
  mineRole,
  locale,
  placeholder,
  sendLabel,
  emptyLabel,
  onSend,
  lockedNotice,
}: {
  messages: ChatMessage[];
  mineRole: 'OWNER' | 'CUSTOMER';
  locale: string;
  placeholder: string;
  sendLabel: string;
  emptyLabel: string;
  onSend: (text: string) => Promise<boolean>;
  lockedNotice?: string;
}) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const submit = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    // نمسح الحقل فقط بعد نجاح الإرسال حتى لا تضيع رسالة المستخدم عند فشل الشبكة
    const ok = await onSend(text);
    if (ok) setInput('');
    setSending(false);
  };

  const timeFmt = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ar-BH', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
    calendar: 'gregory',
  });

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-stone-50">
        {messages.length === 0 ? (
          <p className="text-center text-stone-400 text-sm py-10">{emptyLabel}</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === mineRole;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    mine ? 'bg-brand-600 text-white' : 'bg-white text-stone-800 border border-stone-200'
                  }`}
                >
                  {m.body}
                  <div className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-stone-400'}`}>
                    {timeFmt.format(new Date(m.createdAt))}
                    {mine && ticks(m.status) && (
                      <span className={`ms-1 ${ticks(m.status)!.cls}`}>{ticks(m.status)!.text}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {lockedNotice ? (
        <div className="p-3 border-t border-stone-100 text-center text-xs text-stone-500 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{lockedNotice}</div>
      ) : (
      <div className="p-2 border-t border-stone-100 flex items-center gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && submit()}
          placeholder={placeholder}
          maxLength={2000}
          enterKeyHint="send"
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={submit}
          disabled={sending || !input.trim()}
          className="bg-brand-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          {sendLabel}
        </button>
      </div>
      )}
    </>
  );
}

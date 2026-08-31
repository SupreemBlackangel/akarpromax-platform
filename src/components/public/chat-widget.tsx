"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/src/utils/cn";

/**
 * Messenger-style floating chat: a launcher bubble that opens an in-page
 * conversation panel (list → thread → send) instead of navigating to an inbox
 * page. The rail footer button opens the same panel through the
 * `akar:chat:open` window event.
 */

type ThreadRow = {
  message_threads: { id: string; title: string | null; context: string | null; updatedAt?: string | null };
  message_participants: { id: string };
};

type MessageRow = {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt?: string | null;
};

type ChatWidgetProps = {
  locale: "ar" | "en" | "tr";
  authenticated: boolean;
  onRequireLogin: () => void;
  /** Hide the launcher bubble on desktop when the side rail carries its own chat button. */
  hideLauncherOnRail?: boolean;
};

const TEXT = {
  ar: { title: "الدردشة", empty: "لا توجد محادثات بعد.", loginHint: "سجّل الدخول لبدء الدردشة والتواصل داخل المنصة.", login: "تسجيل الدخول", back: "رجوع", placeholder: "اكتب رسالتك...", send: "إرسال", thread: "محادثة", loading: "جارٍ التحميل..." },
  en: { title: "Chat", empty: "No conversations yet.", loginHint: "Sign in to start chatting on the platform.", login: "Sign in", back: "Back", placeholder: "Type a message...", send: "Send", thread: "Conversation", loading: "Loading..." },
  tr: { title: "Sohbet", empty: "Henüz konuşma yok.", loginHint: "Platformda sohbete başlamak için giriş yapın.", login: "Giriş yap", back: "Geri", placeholder: "Mesaj yazın...", send: "Gönder", thread: "Konuşma", loading: "Yükleniyor..." },
} as const;

export default function ChatWidget({ locale, authenticated, onRequireLogin, hideLauncherOnRail = false }: ChatWidgetProps) {
  const t = TEXT[locale] ?? TEXT.ar;
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [activeThread, setActiveThread] = useState<{ id: string; title: string } | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // The rail footer button (and e.g. "contact the advertiser" buttons) open the
  // panel via this event; a detail of {threadId, title} lands straight in that
  // conversation.
  useEffect(() => {
    const openHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ threadId?: string; title?: string }>).detail;
      if (detail?.threadId) {
        setActiveThread({ id: detail.threadId, title: detail.title || TEXT[locale]?.thread || "محادثة" });
        setMessages([]);
      }
      setOpen(true);
    };
    window.addEventListener("akar:chat:open", openHandler);
    return () => window.removeEventListener("akar:chat:open", openHandler);
  }, [locale]);

  useEffect(() => {
    if (!open || !authenticated) return;
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data?.user?.id) setMyUserId(String(data.user.id));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, authenticated]);

  const loadThreads = useCallback(() => {
    setThreadsLoading(true);
    fetch("/api/messages", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setThreads(data?.success && Array.isArray(data.data) ? data.data : []))
      .catch(() => setThreads([]))
      .finally(() => setThreadsLoading(false));
  }, []);

  useEffect(() => {
    if (!open || !authenticated || activeThread) return;
    const timer = window.setTimeout(loadThreads, 0);
    return () => window.clearTimeout(timer);
  }, [open, authenticated, activeThread, loadThreads]);

  const loadMessages = useCallback((threadId: string, background = false) => {
    if (!background) setMessagesLoading(true);
    fetch(`/api/messages/${encodeURIComponent(threadId)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.data)) {
          setMessages([...(data.data as MessageRow[])].reverse());
        }
      })
      .catch(() => {})
      .finally(() => { if (!background) setMessagesLoading(false); });
  }, []);

  // Light polling keeps the open conversation fresh, Messenger-style.
  useEffect(() => {
    if (!open || !activeThread) return;
    const initial = window.setTimeout(() => loadMessages(activeThread.id), 0);
    const timer = window.setInterval(() => loadMessages(activeThread.id, true), 6000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [open, activeThread, loadMessages]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, messagesLoading]);

  const sendMessage = useCallback(() => {
    const content = draft.trim();
    if (!content || !activeThread || sending) return;
    setSending(true);
    fetch(`/api/messages/${encodeURIComponent(activeThread.id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data?.success && data.data) {
          setMessages((current) => [...current, data.data as MessageRow]);
          setDraft("");
        }
      })
      .catch(() => {})
      .finally(() => setSending(false));
  }, [draft, activeThread, sending]);

  return (
    <>
      {/* Launcher bubble */}
      <button
        type="button"
        aria-label={t.title}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "fixed bottom-5 right-5 z-[90] grid h-16 w-16 place-items-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/40 transition hover:scale-105 hover:bg-blue-700",
          hideLauncherOnRail && "md:hidden",
        )}
      >
        {open ? <X className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label={t.title}
          className="fixed bottom-24 right-5 z-[95] flex h-[480px] w-[min(360px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex items-center gap-2 bg-gradient-to-l from-blue-600 to-indigo-600 px-4 py-3 text-white">
            {activeThread && (
              <button type="button" aria-label={t.back} onClick={() => { setActiveThread(null); setMessages([]); }} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/15">
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <p className="min-w-0 flex-1 truncate text-sm font-black">{activeThread ? activeThread.title : t.title}</p>
            <button type="button" aria-label="×" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/15">
              <X className="h-4 w-4" />
            </button>
          </div>

          {!authenticated ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <MessageCircle className="h-7 w-7" />
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-300">{t.loginHint}</p>
              <button type="button" onClick={() => { setOpen(false); onRequireLogin(); }} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">
                {t.login}
              </button>
            </div>
          ) : activeThread ? (
            <>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-3 dark:bg-gray-950">
                {messagesLoading ? (
                  <p className="py-8 text-center text-xs text-gray-400">{t.loading}</p>
                ) : (
                  messages.map((message) => {
                    const mine = myUserId != null && message.senderId === myUserId;
                    return (
                      <div key={message.id} className={cn("flex", mine ? "justify-start" : "justify-end")}>
                        <div className={cn(
                          "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-6",
                          mine ? "rounded-bl-md bg-blue-600 text-white" : "rounded-br-md bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-100",
                        )}>
                          {message.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex items-center gap-2 border-t border-gray-100 p-2.5 dark:border-gray-800">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }}
                  placeholder={t.placeholder}
                  className="min-w-0 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
                <button
                  type="button"
                  aria-label={t.send}
                  disabled={sending || !draft.trim()}
                  onClick={sendMessage}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40"
                >
                  <Send className="h-4 w-4 -scale-x-100" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {threadsLoading ? (
                <p className="py-10 text-center text-xs text-gray-400">{t.loading}</p>
              ) : threads.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <MessageCircle className="h-7 w-7" />
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t.empty}</p>
                </div>
              ) : (
                threads.map((row) => {
                  const title = row.message_threads.title || t.thread;
                  return (
                    <button
                      key={row.message_threads.id}
                      type="button"
                      onClick={() => setActiveThread({ id: row.message_threads.id, title })}
                      className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-start transition hover:bg-blue-50/60 dark:border-gray-800 dark:hover:bg-gray-800"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-sm font-black text-white">
                        {title.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-gray-800 dark:text-gray-100">{title}</span>
                        {row.message_threads.context && (
                          <span className="block truncate text-xs text-gray-400">{row.message_threads.context}</span>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

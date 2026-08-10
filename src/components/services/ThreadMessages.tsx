"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, formatTime, messageContextLabel } from "@services-client";

type Message = Record<string, unknown> & {
  id: string;
  sender_user_id: string;
  body?: string | null;
  created_at?: string;
};

export default function ThreadMessages({
  threadType,
  threadId,
  threadTitle,
  viewerEmail,
  t,
}: {
  threadType: string;
  threadId: string;
  threadTitle?: string | null;
  viewerEmail: string | null;
  t: (key: string) => string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ messages: Message[] }>(`/api/service-messages/threads/${threadType}/${encodeURIComponent(threadId)}`)
      .then((data) => {
        if (!controller.signal.aborted) setMessages(data.messages ?? []);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [threadType, threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const data = await apiFetch<{ id: string }>("/api/service-messages", {
        method: "POST",
        body: JSON.stringify({ threadType, threadId, body: text }),
      });
      const msg: Message = {
        id: data.id,
        sender_user_id: viewerEmail ?? "",
        body: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, msg]);
      setBody("");
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-gray-400">
          {messageContextLabel(threadType, "ar")} {threadTitle ? `— ${threadTitle}` : `#${String(threadId).slice(0, 8)}`}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 p-3 min-h-[220px] max-h-[380px]">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-10">{t("services.noMessages") ?? "لا توجد رسائل بعد. ابدأ المحادثة."}</p>
        )}
        {messages.map((message) => {
          const mine = message.sender_user_id === viewerEmail;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-md"
                }`}
              >
                {message.body && <p className="whitespace-pre-line">{message.body}</p>}
                <p className={`mt-1 text-[10px] ${mine ? "text-blue-200" : "text-gray-400"}`}>{formatTime(message.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          placeholder={t("services.writeMessage") ?? "اكتب رسالة..."}
          className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={() => void send()} disabled={sending || !body.trim()} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition">
          {t("services.send") ?? "إرسال"}
        </button>
      </div>
    </div>
  );
}

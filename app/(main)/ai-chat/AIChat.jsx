"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { getAiChatHistory, sendAiChatMessage } from "@/actions/aiChat";
import { QUESTION_CATEGORIES } from "@/lib/ai-questions.mjs";

const categories = Object.keys(QUESTION_CATEGORIES);

export default function AIChat({ bookingId = null, initialCategory = "FRONTEND", lockedCategory = false }) {
  const [category, setCategory] = useState(initialCategory);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [retryRequestId, setRetryRequestId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let active = true;
    getAiChatHistory({ bookingId, category }).then((result) => {
      if (!active) return;
      if (result.success) {
        setConversationId(result.conversationId);
        setMessages(result.messages);
        setError("");
      } else setError(result.error);
    }).catch(() => {
      if (active) setError("Chat history could not be loaded. Retry by sending a message.");
    }).finally(() => { if (active) setLoadingHistory(false); });
    return () => { active = false; };
  }, [bookingId, category]);

  function submit(event) {
    event.preventDefault();
    const clean = message.trim();
    if (!clean || isPending || loadingHistory) return;
    const requestId = retryRequestId || crypto.randomUUID();
    setError("");
    startTransition(async () => {
      try {
        const result = await sendAiChatMessage({
          message: clean,
          category,
          bookingId,
          conversationId,
          requestId,
        });
        if (!result.success) {
          if (result.conversationId) setConversationId(result.conversationId);
          setRetryRequestId(result.requestId || requestId);
          setError(result.error || "Your message could not be sent. Please retry.");
          return;
        }
        setConversationId(result.conversationId);
        setMessages(result.messages || [...messages, { role: "user", content: clean }, { role: "model", content: result.reply }]);
        setMessage("");
        setRetryRequestId(null);
        inputRef.current?.focus();
      } catch {
        setRetryRequestId(requestId);
        setError("Connection interrupted. Your message is safe to retry.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 text-white shadow-xl sm:p-6" aria-labelledby="ai-chat-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-300"><MessageCircle size={19} /></span>
          <div>
            <h2 id="ai-chat-title" className="font-semibold">PrepIQ AI Chat</h2>
            <p className="text-xs text-gray-400">Ask follow-up questions and practice at your pace.</p>
          </div>
        </div>
        {!lockedCategory && (
          <label className="text-xs text-gray-400">Domain
          <select className="ml-2 rounded-lg border border-white/10 bg-[#181818] px-2 py-2 text-sm text-white" value={category} onChange={(event) => { setMessages([]); setConversationId(null); setLoadingHistory(true); setCategory(event.target.value); }} disabled={isPending}>
              {categories.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
            </select>
          </label>
        )}
      </header>

      <div className="mt-5 max-h-[min(50vh,28rem)] min-h-36 space-y-3 overflow-y-auto rounded-xl border border-white/5 bg-black/20 p-3" aria-live="polite" aria-busy={loadingHistory || isPending}>
        {loadingHistory ? <p className="py-8 text-center text-sm text-gray-400">Loading your conversation…</p> : messages.length === 0 ? (
          <div className="flex min-h-28 flex-col items-center justify-center gap-2 text-center text-sm text-gray-400"><Sparkles size={18} className="text-amber-300" />Start with a question about {category.replaceAll("_", " ").toLowerCase()} interviews.</div>
        ) : messages.map((item, index) => (
          <div key={`${index}-${item.role}`} className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2.5 text-sm leading-6 ${item.role === "user" ? "ml-auto bg-amber-300/15 text-amber-50" : "bg-white/[0.06] text-gray-200"}`}>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-amber-300">{item.role === "user" ? "You" : "PrepIQ AI"}</span>{item.content}
          </div>
        ))}
        {isPending && <p className="text-sm text-gray-400" role="status">PrepIQ is thinking…</p>}
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
      <form className="mt-4 flex gap-2" onSubmit={submit}>
        <input ref={inputRef} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} aria-label="Message PrepIQ AI" placeholder="Ask a question or continue the conversation…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-amber-300/50" disabled={isPending || loadingHistory} />
        <button type="submit" disabled={!message.trim() || isPending || loadingHistory} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"><Send size={15} /><span className="hidden sm:inline">Send</span></button>
      </form>
      <p className="mt-2 text-xs text-gray-500">AI responses may be inaccurate. Provider usage limits apply.</p>
    </section>
  );
}

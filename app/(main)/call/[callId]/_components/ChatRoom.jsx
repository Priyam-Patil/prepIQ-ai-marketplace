"use client";

import { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { getChatToken } from "@/actions/call";

function formatMessageTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function ChatRoom({ bookingId, apiKey, user, peerName }) {
  const [channel, setChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!apiKey) return undefined;

    let active = true;
    let activeChannel;
    const client = StreamChat.getInstance(apiKey);

    const connect = async () => {
      try {
        await client.connectUser(
          { id: user.id, name: user.name || "PrepIQ member", image: user.imageUrl || undefined },
          async () => (await getChatToken(bookingId)).token,
        );
        activeChannel = client.channel("messaging", bookingId);
        const state = await activeChannel.watch();
        if (!active) return;
        setMessages(state.messages || []);
        setChannel(activeChannel);
        activeChannel.on("message.new", (event) => {
          const incoming = event.message;
          if (!incoming) return;
          setMessages((current) => current.some((item) => item.id === incoming.id) ? current : [...current, incoming]);
        });
      } catch (connectError) {
        if (active) setError(connectError instanceof Error ? connectError.message : "Could not open this conversation.");
      } finally {
        if (active) setLoading(false);
      }
    };

    connect();
    return () => {
      active = false;
      activeChannel?.stopWatching().catch(() => {});
      if (client.userID) client.disconnectUser().catch(() => {});
    };
  }, [apiKey, bookingId, user.id, user.imageUrl, user.name]);

  const send = async (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!channel || !text || sending) return;
    setSending(true);
    try {
      await channel.sendMessage({ text });
      setMessage("");
    } catch {
      setError("Message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Session thread</p>
          <h2 className="mt-2 text-lg font-semibold">Chat with {peerName || "your interview partner"}</h2>
        </div>
        <span className="text-xs text-gray-500">Private to this booking</span>
      </div>

      {(error || !apiKey) && <p role="alert" className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">{error || "Stream Chat is not configured."}</p>}
      <div aria-live="polite" className="mt-4 flex max-h-80 min-h-40 flex-col gap-3 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-3">
        {loading && apiKey ? <p className="m-auto text-sm text-gray-500">Loading conversation…</p> : messages.length ? messages.map((item) => {
          const ownMessage = item.user?.id === user.id;
          return <div key={item.id} className={`max-w-[88%] rounded-xl px-3 py-2 ${ownMessage ? "ml-auto bg-amber-400/10 text-amber-50" : "bg-white/[0.06] text-gray-200"}`}><div className="flex items-center justify-between gap-4"><span className="text-xs font-medium">{ownMessage ? "You" : item.user?.name || peerName || "Interview partner"}</span><time className="text-[10px] text-gray-500">{formatMessageTime(item.created_at)}</time></div><p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.text}</p></div>;
        }) : apiKey && !error ? <p className="m-auto text-sm text-gray-500">No messages yet. Send a note to start the conversation.</p> : null}
      </div>

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} placeholder="Write a message…" aria-label="Message" disabled={!channel || sending} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 disabled:opacity-50" />
        <button type="submit" disabled={!channel || !message.trim() || sending} className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">Send</button>
      </form>
      <p className="mt-2 text-right text-[11px] text-gray-600">Messages remain available with your appointment.</p>
    </section>
  );
}

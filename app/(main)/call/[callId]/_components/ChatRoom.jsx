"use client";

import { useEffect, useRef, useState } from "react";
import { getChatToken } from "@/actions/call";
import { acquireChatClient } from "@/lib/stream-chat-lifecycle.mjs";
import { getSafeStreamErrorDetails } from "@/lib/stream-error.mjs";

function formatMessageTime(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (!Number.isFinite(date.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function ChatRoom({
  bookingId,
  streamCallId,
  apiKey,
  user,
  peerName,
}) {
  const [channel, setChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const mountedRef = useRef(false);

  useEffect(() => {
    let active = true;
    let activeChannel = null;
    let messageHandler = null;
    let lease = null;
    mountedRef.current = true;

    async function initialize() {
      setLoading(true);
      setError("");

      if (!apiKey || !streamCallId) {
        setError("Chat is not configured for this session.");
        setLoading(false);
        return;
      }

      try {
        lease = acquireChatClient({
          apiKey,
          user: {
            id: user.id,
            name: user.name || "PrepIQ member",
            ...(user.imageUrl ? { image: user.imageUrl } : {}),
          },
          tokenProvider: async () => {
            const result = await getChatToken(bookingId);
            return result.token;
          },
          onError: () => {
            if (active) setError("Chat could not connect. Refresh the page and try again.");
          },
        });
        const { client } = lease;
        await lease.ready;

        if (!active) {
          lease.release();
          return;
        }

        activeChannel = client.channel("messaging", streamCallId);
        await activeChannel.watch();

        if (!active) {
          await activeChannel.stopWatching();
          lease.release();
          return;
        }

        setChannel(activeChannel);
        setMessages(activeChannel.state.messages || []);

        messageHandler = (event) => {
          if (!active || !event.message) return;

          setMessages((previous) => {
            if (previous.some((item) => item.id === event.message.id)) {
              return previous;
            }

            return [...previous, event.message];
          });
        };

        activeChannel.on("message.new", messageHandler);
      } catch (initError) {
        if (activeChannel) {
          if (messageHandler) {
            activeChannel.off("message.new", messageHandler);
          }
          await activeChannel.stopWatching().catch(() => {});
          activeChannel = null;
        }
        lease?.release();
        lease = null;
        if (active) {
          if (process.env.NODE_ENV === "development") {
            console.error(
              "Session chat initialization failed.",
              getSafeStreamErrorDetails(initError)
            );
          }
          setError("Unable to open session chat. Check your connection and try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;
      mountedRef.current = false;

      if (activeChannel) {
        if (messageHandler) {
          activeChannel.off("message.new", messageHandler);
        }

        activeChannel.stopWatching().catch(() => {});
      }

      lease?.release();
    };
  }, [
    apiKey,
    bookingId,
    streamCallId,
    user.id,
    user.imageUrl,
    user.name,
  ]);

  async function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();

    if (!text || !channel || sending) return;

    setSending(true);
    setError("");

    try {
      const result = await channel.sendMessage({ text });

      if (result?.message) {
        if (mountedRef.current) {
          setMessages((previous) => {
            if (previous.some((item) => item.id === result.message.id)) {
              return previous;
            }
            return [...previous, result.message];
          });
        }
      }

      if (mountedRef.current) setMessage("");
    } catch (sendError) {
      if (mountedRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            "Session chat message send failed.",
            getSafeStreamErrorDetails(sendError, { includeMessage: false })
          );
        }
        setError("Message could not be sent. Check your connection and try again.");
      }
    } finally {
      if (mountedRef.current) setSending(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="font-semibold">Session chat</h2>
        <p className="mt-1 text-sm text-gray-400">
          Conversation with {peerName || "your interviewer"}
        </p>
      </div>

      <div className="max-h-[26rem] min-h-48 space-y-3 overflow-y-auto p-5">
        {loading && (
          <p className="text-sm text-gray-400">Connecting to chat...</p>
        )}

        {!loading && !error && messages.length === 0 && (
          <p className="text-sm text-gray-500">
            No messages yet. Start the conversation.
          </p>
        )}

        {messages.map((item) => {
          const own = item.user?.id === user.id;

          return (
            <div
              key={item.id}
              className={`flex ${own ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 ${
                  own
                    ? "bg-amber-400 text-black"
                    : "bg-white/[0.08] text-white"
                }`}
              >
                <p className="whitespace-pre-wrap break-words text-sm">
                  {item.text || ""}
                </p>

                <p
                  className={`mt-1 text-[10px] ${
                    own ? "text-black/60" : "text-gray-500"
                  }`}
                >
                  {own ? "You" : item.user?.name || peerName || "Participant"}
                  {" · "}
                  {formatMessageTime(item.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="px-5 pb-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <form
        onSubmit={sendMessage}
        className="flex gap-2 border-t border-white/10 p-4"
      >
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={2000}
          placeholder="Write a message..."
          aria-label="Chat message"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-amber-400"
        />

        <button
          type="submit"
          disabled={loading || !channel || sending || !message.trim()}
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}

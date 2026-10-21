export const AI_CHAT_CATEGORIES = Object.freeze([
  "FRONTEND", "BACKEND", "FULLSTACK", "DSA", "SYSTEM_DESIGN", "BEHAVIORAL", "DEVOPS", "MOBILE",
]);

export function validateChatInput({ message, category, requestId }) {
  if (typeof message !== "string" || !message.trim() || message.length > 4000) return "Enter a message up to 4,000 characters.";
  if (!AI_CHAT_CATEGORIES.includes(category)) return "Choose a valid interview category.";
  if (typeof requestId !== "string" || !/^[\w-]{16,80}$/.test(requestId)) return "Refresh and try sending your message again.";
  return null;
}

export function toGeminiHistory(messages) {
  const history = [];
  for (const message of messages) {
    if (!["user", "model"].includes(message.role)) continue;
    const expectedRole = history.length % 2 === 0 ? "user" : "model";
    if (message.role === expectedRole) history.push({ role: message.role, parts: [{ text: message.content }] });
  }
  if (history.at(-1)?.role === "user") history.pop();
  return history;
}

export function isConversationOwner(conversation, userId, bookingId) {
  return Boolean(conversation && conversation.userId === userId && (conversation.bookingId || null) === (bookingId || null));
}

export async function requestChatReply({ model, history, message, timeoutMs = 30_000 }) {
  let timeout;
  const result = await Promise.race([
    model.startChat({ history }).sendMessage(message),
    new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs); }),
  ]).finally(() => clearTimeout(timeout));
  const reply = result.response.text()?.trim();
  if (!reply || reply.length > 30_000) throw new Error("EMPTY_RESPONSE");
  return reply;
}

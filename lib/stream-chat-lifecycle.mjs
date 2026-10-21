import { StreamChat } from "stream-chat";

export function createChatClientManager(createClient) {
  const connections = new Map();

  function notifyConnectionError(entry) {
    entry.listeners.forEach((listener) => {
      if (typeof listener === "function") listener();
    });
  }

  function connectEntry(entry) {
    entry.connectPromise = entry.client
      .connectUser(entry.user, () => entry.tokenProvider())
      .catch((error) => {
        entry.connectFailed = true;
        notifyConnectionError(entry);
        throw error;
      });
    entry.connectPromise.catch(() => {});
    return entry.connectPromise;
  }

  function acquireChatClient({ apiKey, user, tokenProvider, onError }) {
    if (!apiKey || !user?.id || typeof tokenProvider !== "function") {
      throw new Error("Chat client configuration is incomplete.");
    }

    const key = `${apiKey}:${user.id}`;
    let entry = connections.get(key);
    if (!entry) {
      const client = createClient(apiKey);
      if (client.userID && client.userID !== user.id) {
        throw new Error("A different chat account is already connected.");
      }
      entry = {
        client,
        user,
        refs: 0,
        timer: null,
        disconnectPromise: null,
        connectPromise: client.userID === user.id ? Promise.resolve() : null,
        connectFailed: false,
        listeners: new Set(),
        tokenProvider,
      };
      connections.set(key, entry);
      if (!entry.connectPromise) connectEntry(entry);
    }

    clearTimeout(entry.timer);
    entry.timer = null;
    entry.refs += 1;
    entry.listeners.add(onError);
    entry.tokenProvider = tokenProvider;

    if (entry.disconnectPromise) {
      const disconnectPromise = entry.disconnectPromise;
      entry.connectPromise = disconnectPromise
        .catch(() => {})
        .then(() => {
          if (entry.refs === 0 || entry.client.userID === user.id) return;
          return connectEntry(entry);
        });
      entry.connectPromise.catch(() => {});
    } else if (entry.connectFailed) {
      entry.connectFailed = false;
      connectEntry(entry);
    }

    let released = false;
    return {
      client: entry.client,
      ready: entry.connectPromise,
      release() {
        if (released) return;
        released = true;
        entry.listeners.delete(onError);
        entry.refs = Math.max(0, entry.refs - 1);
        if (entry.refs !== 0) return;
        entry.timer = setTimeout(() => {
          if (entry.refs !== 0) return;
          entry.disconnectPromise = (async () => {
            try {
              await entry.connectPromise?.catch(() => {});
              if (entry.refs === 0 && entry.client.userID === user.id) {
                await entry.client.disconnectUser();
              }
            } catch {
              // A failed or already closed connection needs no further cleanup.
            } finally {
              if (entry.refs === 0 && connections.get(key) === entry) {
                connections.delete(key);
              }
              entry.disconnectPromise = null;
            }
          })();
        }, 1000);
      },
    };
  }

  return { acquireChatClient };
}

const chatClientManager = createChatClientManager((apiKey) => StreamChat.getInstance(apiKey));

export const acquireChatClient = chatClientManager.acquireChatClient;

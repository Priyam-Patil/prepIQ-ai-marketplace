import { StreamVideoClient } from "@stream-io/video-react-sdk";
import { getSafeStreamErrorDetails } from "./stream-error.mjs";

export function createVideoClientManager(createClient) {
  const clients = new Map();
  const calls = new WeakMap();

  function notifyConnectionError(entry, error) {
    entry.listeners.forEach((listener) => {
      if (typeof listener === "function") listener(error);
    });
  }

  function connectEntry(entry) {
    entry.connectPromise = entry.client
      .connectUser(entry.user, () => entry.tokenProvider())
      .then(() => {
        entry.connectPromiseFailed = false;
      }, (error) => {
        entry.connectPromiseFailed = true;
        notifyConnectionError(entry, error);
        throw error;
      });
    // Keep a rejected connection observable to the active lease without
    // creating an unhandled rejection before the component awaits `ready`.
    entry.connectPromise.catch(() => {});
    return entry.connectPromise;
  }

  function reconnectEntry(entry, afterDisconnect = Promise.resolve()) {
    if (entry.reconnecting) return entry.connectPromise;

    entry.reconnecting = true;
    const connection = afterDisconnect
      .catch(() => {})
      .then(() => {
        if (entry.refs === 0) return;
        return connectEntry(entry);
      })
      .finally(() => {
        entry.reconnecting = false;
      });
    entry.connectPromise = connection;
    connection.catch(() => {});
    return connection;
  }

  function acquireVideoClient({ apiKey, user, tokenProvider, onError }) {
    if (!apiKey || !user?.id || typeof tokenProvider !== "function") {
      throw new Error("Video client configuration is incomplete.");
    }

    const key = `${apiKey}:${user.id}`;
    let entry = clients.get(key);
    if (!entry) {
      entry = {
        refs: 0,
        timer: null,
        listeners: new Set(),
        client: createClient(apiKey),
        user: {
          id: user.id,
          name: user.name || "PrepIQ member",
          image: user.imageUrl || undefined,
        },
        tokenProvider,
        connectPromise: null,
        disconnectPromise: null,
        reconnecting: false,
      };
      clients.set(key, entry);
      connectEntry(entry);
    }

    clearTimeout(entry.timer);
    entry.timer = null;
    entry.refs += 1;
    entry.listeners.add(onError);
    entry.tokenProvider = tokenProvider;

    if (entry.disconnectPromise) {
      reconnectEntry(entry, entry.disconnectPromise);
    } else if (entry.connectPromiseFailed) {
      reconnectEntry(entry);
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
              // StreamVideoClient.connectUser already disconnects itself when
              // authentication/connection fails (SDK 1.62.0).
              if (entry.refs === 0 && !entry.connectPromiseFailed) {
                await entry.client.disconnectUser();
              }
            } catch (error) {
              if (process.env.NODE_ENV === "development") {
                console.error(
                  "Stream video client cleanup failed.",
                  getSafeStreamErrorDetails(error)
                );
              }
            } finally {
              if (entry.refs === 0 && clients.get(key) === entry) {
                clients.delete(key);
              }
              entry.disconnectPromise = null;
            }
          })();
        }, 1000);
      },
    };
  }

  function acquireVideoCall(call, onError) {
    let entry = calls.get(call);
    if (!entry) {
      entry = {
        refs: 0,
        timer: null,
        joinPromise: null,
        joinSucceeded: false,
        listeners: new Set(),
      };
      calls.set(call, entry);
    }
    clearTimeout(entry.timer);
    entry.timer = null;
    entry.refs += 1;
    entry.listeners.add(onError);
    entry.joinPromise ??= Promise.resolve()
      .then(() => call.join({ create: false }))
      .then(() => {
        entry.joinSucceeded = true;
      });
    const ready = entry.joinPromise.catch((error) => {
      entry.listeners.forEach((listener) => {
        if (typeof listener === "function") listener(error);
      });
      throw error;
    });

    let released = false;
    return {
      ready,
      release() {
        if (released) return;
        released = true;
        entry.listeners.delete(onError);
        entry.refs = Math.max(0, entry.refs - 1);
        if (entry.refs !== 0) return;
        entry.timer = setTimeout(async () => {
          if (entry.refs !== 0) return;
          try {
            await entry.joinPromise?.catch(() => {});
            const alreadyLeft = call.state?.callingState === "left";
            if (entry.refs === 0 && entry.joinSucceeded && !alreadyLeft) {
              await call.leave();
            }
          } catch (error) {
            // The SDK can receive a remote leave while local cleanup is queued.
            // Avoid masking any other cleanup failure in development logs.
            if (
              call.state?.callingState !== "left" &&
              process.env.NODE_ENV === "development"
            ) {
              console.error(
                "Stream video call cleanup failed.",
                getSafeStreamErrorDetails(error)
              );
            }
          } finally {
            if (entry.refs === 0) calls.delete(call);
          }
        }, 0);
      },
    };
  }

  return { acquireVideoClient, acquireVideoCall };
}

const videoClientManager = createVideoClientManager(
  (apiKey) => new StreamVideoClient(apiKey)
);

export const acquireVideoClient = videoClientManager.acquireVideoClient;
export const acquireVideoCall = videoClientManager.acquireVideoCall;

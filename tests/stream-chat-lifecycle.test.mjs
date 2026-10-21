import test from "node:test";
import assert from "node:assert/strict";
import { createChatClientManager } from "../lib/stream-chat-lifecycle.mjs";

function makeManager({ failFirst = false } = {}) {
  const clients = [];
  const manager = createChatClientManager((apiKey) => {
    const client = {
      apiKey,
      connectCalls: 0,
      disconnectCalls: 0,
      async connectUser(user, tokenProvider) {
        this.connectCalls += 1;
        const token = await tokenProvider();
        if (failFirst && this.connectCalls === 1) {
          throw new Error("mocked chat transport failure");
        }
        this.userID = user.id;
        this.token = token;
      },
      async disconnectUser() {
        this.disconnectCalls += 1;
        this.userID = undefined;
      },
    };
    clients.push(client);
    return client;
  });
  return { manager, clients };
}

const options = (tokenProvider, onError = () => {}) => ({
  apiKey: "public-test-key",
  user: { id: "database-user-id", name: "Test user" },
  tokenProvider,
  onError,
});

test("chat lifecycle shares one authenticated connection between mounted consumers", async () => {
  const { manager, clients } = makeManager();
  const first = manager.acquireChatClient(options(async () => "valid-chat-token"));
  const second = manager.acquireChatClient(options(async () => "unused-token"));
  await Promise.all([first.ready, second.ready]);

  assert.equal(first.client, second.client);
  assert.equal(clients.length, 1);
  assert.equal(first.client.connectCalls, 1);
  assert.equal(first.client.userID, "database-user-id");
  assert.equal(first.client.token, "valid-chat-token");

  first.release();
  second.release();
});

test("chat connection failure is surfaced and a later lease can retry", async () => {
  const { manager, clients } = makeManager({ failFirst: true });
  let failures = 0;
  const request = options(async () => "valid-chat-token", () => { failures += 1; });
  const first = manager.acquireChatClient(request);

  await assert.rejects(first.ready, /mocked chat transport failure/);
  assert.equal(failures, 1);
  first.release();

  const retry = manager.acquireChatClient(request);
  await retry.ready;
  assert.equal(clients.length, 1);
  assert.equal(clients[0].connectCalls, 2);
  assert.equal(clients[0].userID, "database-user-id");
  retry.release();
});

test("chat lifecycle rejects missing credentials before opening a client", () => {
  const { manager, clients } = makeManager();
  assert.throws(
    () => manager.acquireChatClient({ ...options(async () => "token"), apiKey: "" }),
    /configuration is incomplete/
  );
  assert.equal(clients.length, 0);
});

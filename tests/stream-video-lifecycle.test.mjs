import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { createVideoClientManager } from "../lib/stream-video-lifecycle.mjs";

function setupManager() {
  const created = [];
  const manager = createVideoClientManager((apiKey) => {
    const client = {
      apiKey,
      connectCalls: 0,
      disconnectCalls: 0,
      async connectUser(user, tokenProvider) {
        this.connectCalls += 1;
        this.connectedUser = user;
        this.token = await tokenProvider();
      },
      async disconnectUser() {
        this.disconnectCalls += 1;
        this.connectedUser = undefined;
      },
    };
    created.push(client);
    return client;
  });
  return { manager, created };
}

const request = (tokenProvider, onError = () => {}) => ({
  apiKey: "public-test-key",
  user: { id: "database-user-id", name: "Test user" },
  tokenProvider,
  onError,
});

test("video client lease awaits token-backed connection and deduplicates Strict Mode mounts", async () => {
  const { manager, created } = setupManager();
  let tokenRequests = 0;
  const first = manager.acquireVideoClient(request(async () => {
    tokenRequests += 1;
    return "signed-call-token";
  }));
  const second = manager.acquireVideoClient(request(async () => "unused-token"));

  assert.equal(first.client, second.client);
  await Promise.all([first.ready, second.ready]);
  assert.equal(created.length, 1);
  assert.equal(first.client.connectCalls, 1);
  assert.equal(tokenRequests, 1);
  assert.equal(first.client.token, "signed-call-token");

  first.release();
  await delay(20);
  assert.equal(first.client.disconnectCalls, 0);
  second.release();
});

test("video client refuses missing configuration before creating an SDK client", () => {
  const { manager, created } = setupManager();
  assert.throws(
    () => manager.acquireVideoClient({ ...request(async () => "token"), apiKey: "" }),
    /configuration is incomplete/
  );
  assert.equal(created.length, 0);
});

test("video call lease joins the requested existing call once and leaves after the last release", async () => {
  const { manager } = setupManager();
  const calls = [];
  const call = {
    async join(options) {
      calls.push(options);
    },
    async leave() {
      calls.push("leave");
    },
  };
  const first = manager.acquireVideoCall(call, () => {});
  const second = manager.acquireVideoCall(call, () => {});
  await Promise.all([first.ready, second.ready]);

  assert.deepEqual(calls, [{ create: false }]);
  first.release();
  await delay(20);
  assert.deepEqual(calls, [{ create: false }]);
  second.release();
  await delay(20);
  assert.deepEqual(calls, [{ create: false }, "leave"]);
});

test("failed joins do not call leave on a call that never joined", async () => {
  const { manager } = setupManager();
  const calls = [];
  const call = {
    state: { callingState: "idle" },
    async join(options) {
      calls.push(["join", options]);
      throw new Error("signaling timeout");
    },
    async leave() {
      calls.push(["leave"]);
    },
  };
  const lease = manager.acquireVideoCall(call, () => {});
  await assert.rejects(lease.ready, /signaling timeout/);
  lease.release();
  await delay(20);
  assert.deepEqual(calls, [["join", { create: false }]]);
});

test("cleanup skips a call already left by the SDK or remote participant", async () => {
  const { manager } = setupManager();
  let leaveCalls = 0;
  const call = {
    state: { callingState: "joined" },
    async join() {},
    async leave() {
      leaveCalls += 1;
      this.state.callingState = "left";
    },
  };
  const first = manager.acquireVideoCall(call, () => {});
  await first.ready;
  call.state.callingState = "left";
  first.release();
  await delay(20);
  assert.equal(leaveCalls, 0);
});

test("unmount during an in-flight join waits for it and leaves once after success", async () => {
  const { manager } = setupManager();
  const calls = [];
  let finishJoin;
  const call = {
    state: { callingState: "joining" },
    join() {
      calls.push("join");
      return new Promise((resolve) => {
        finishJoin = () => {
          this.state.callingState = "joined";
          resolve();
        };
      });
    },
    async leave() {
      calls.push("leave");
      this.state.callingState = "left";
    },
  };
  const lease = manager.acquireVideoCall(call, () => {});
  lease.release();
  await delay(5);
  finishJoin();
  await delay(20);
  assert.deepEqual(calls, ["join", "leave"]);
});

test("a later visit creates a fresh client with its new token provider after disconnect", async () => {
  const { manager, created } = setupManager();
  const first = manager.acquireVideoClient(request(async () => "first-token"));
  await first.ready;
  first.release();
  await delay(1100);

  assert.equal(created[0].disconnectCalls, 1);

  const next = manager.acquireVideoClient(request(async () => "fresh-token"));
  await next.ready;
  assert.equal(created.length, 2);
  assert.equal(next.client.token, "fresh-token");
  next.release();
});

test("a rejected video token is reported and reconnection requests a fresh token", async () => {
  const created = [];
  let tokenRequests = 0;
  let errorsReported = 0;
  const manager = createVideoClientManager(() => {
    const client = {
      connectCalls: 0,
      async connectUser(_user, tokenProvider) {
        this.connectCalls += 1;
        this.token = await tokenProvider();
        if (this.connectCalls === 1) {
          throw Object.assign(new Error("AuthErrorTokenUsedBeforeIssuedAt"), { code: "JWTAuth" });
        }
      },
      async disconnectUser() {},
    };
    created.push(client);
    return client;
  });
  const options = request(async () => `fresh-token-${++tokenRequests}`, () => { errorsReported += 1; });
  const lease = manager.acquireVideoClient(options);

  await assert.rejects(lease.ready, /AuthErrorTokenUsedBeforeIssuedAt/);
  assert.equal(errorsReported, 1);
  assert.equal(created[0].token, "fresh-token-1");
  lease.release();

  const retry = manager.acquireVideoClient(options);
  await retry.ready;
  assert.equal(created.length, 1);
  assert.equal(created[0].connectCalls, 2);
  assert.equal(created[0].token, "fresh-token-2");
  retry.release();
});

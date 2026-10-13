import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";

import type { Config } from "./bridge.ts";
import {
  Bridge,
  configured,
  createBridgeServer,
  messageKey,
  parseMessage,
  REPLY_PREFIX,
  validSignature,
} from "./bridge.ts";

function configuration(t: TestContext): Config {
  const directory = mkdtempSync(join(tmpdir(), "adrenaline-openwa-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return {
    host: "127.0.0.1",
    port: 18878,
    databasePath: join(directory, "queue.sqlite"),
    webhookSecret: "test-secret-only-abcdefghijklmnopqrstuvwxyz",
    sessionId: "test-session",
    allowedGroupIds: ["test-group@g.us"],
    allowedSenderIds: ["test-person@lid"],
    allowFromMe: false,
    selfSenderId: "",
    maxAttempts: 3,
    tasks: {
      baseUrl: "https://task.adrenaent.com",
      apiKey: "test-only-task-key",
      workspacePublicId: "workspace123",
      boardPublicId: "testboard123",
      inboxListPublicId: "inboxlist123",
      doneListPublicId: "completed123",
      ownerMemberPublicId: "ownermember1",
    },
    openwa: {
      baseUrl: "http://127.0.0.1:3000",
      apiKey: "test-only-openwa-key",
    },
  };
}

function envelope(
  body = "!task Prepare stage layout | 2026-10-20",
  overrides: Record<string, unknown> = {},
) {
  return {
    event: "message.received",
    sessionId: "test-session",
    data: {
      id: "incoming-test-1",
      chatId: "test-group@g.us",
      author: "test-person@lid",
      body,
      type: "text",
      fromMe: false,
      isGroup: true,
      ...overrides,
    },
  };
}

function board(
  cards: { publicId: string; title: string; description: string | null }[] = [],
) {
  return {
    publicId: "testboard123",
    workspace: {
      publicId: "workspace123",
      members: [{ publicId: "ownermember1", status: "active" }],
    },
    lists: [
      { publicId: "inboxlist123", name: "Ready", cards },
      { publicId: "completed123", name: "Done", cards: [] },
    ],
  };
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status });
}

test("HMAC authenticates exact bytes, rejecting invalid or missing signatures", () => {
  const secret = "test-secret-abcdefghijklmnopqrstuvwxyz";
  const raw = Buffer.from('{"text":"مهمة"}');
  const signature = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  assert.equal(validSignature(raw, signature, secret), true);
  assert.equal(
    validSignature(Buffer.from('{ "text":"مهمة"}'), signature, secret),
    false,
  );
  assert.equal(validSignature(raw, signature.slice(7), secret), false);
  assert.equal(validSignature(raw, "sha256=bad", secret), false);
  assert.equal(validSignature(raw, signature, ""), false);
});

test("session, group, sender, type and echo checks fail closed", (t) => {
  const config = configuration(t);
  assert.equal(configured(config), true);
  assert.ok(parseMessage(envelope(), config));
  for (const override of [
    { chatId: "unapproved@g.us" },
    { author: "stranger@lid" },
    { isGroup: false },
    { type: "image" },
    { fromMe: true },
    { body: `${REPLY_PREFIX}\n!task echo` },
    { body: "ordinary chat" },
    { author: "", from: "test-person@lid" },
  ]) {
    assert.equal(parseMessage(envelope(undefined, override), config), null);
  }
  assert.equal(
    parseMessage({ ...envelope(), sessionId: "wrong" }, config),
    null,
  );
  assert.equal(
    parseMessage({ ...envelope(), event: "message.sent" }, config),
    null,
  );
  assert.equal(
    parseMessage(envelope(), { ...config, allowedGroupIds: [] }),
    null,
  );
  assert.equal(
    parseMessage(envelope(), {
      ...config,
      tasks: { ...config.tasks, boardPublicId: "" },
    }),
    null,
  );
});

test("self messages require explicitly allowlisted configured owner", (t) => {
  const config = configuration(t);
  const self = {
    ...config,
    allowFromMe: true,
    selfSenderId: "test-person@lid",
  };
  assert.equal(
    parseMessage(
      envelope("مهمة تجربة", { fromMe: true, author: undefined }),
      self,
    )?.senderId,
    "test-person@lid",
  );
  assert.equal(
    parseMessage(envelope("!task test", { fromMe: true }), {
      ...self,
      selfSenderId: "stranger@lid",
    }),
    null,
  );
});

test("linked-phone sent events require self-account opt-in and cannot echo replies", (t) => {
  const config = configuration(t);
  const self = {
    ...config,
    allowFromMe: true,
    selfSenderId: "test-person@lid",
  };
  const sent = {
    ...envelope("مهمة تجربة", { fromMe: true, author: undefined }),
    event: "message.sent",
  };
  assert.equal(parseMessage(sent, config), null);
  const message = parseMessage(sent, self);
  assert.ok(message);
  assert.equal(message.senderId, "test-person@lid");
  const received = parseMessage({ ...sent, event: "message.received" }, self);
  assert.ok(received);
  assert.equal(messageKey(message), messageKey(received));
  assert.equal(
    parseMessage({ ...envelope("!help"), event: "message.sent" }, self),
    null,
  );
  assert.equal(
    parseMessage(
      {
        ...envelope(`${REPLY_PREFIX}\n!help`, { fromMe: true }),
        event: "message.sent",
      },
      self,
    ),
    null,
  );
});

test("duplicate event creates one assigned task and one prefixed reply", async (t) => {
  const config = configuration(t);
  let creates = 0;
  let sends = 0;
  const mock: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/boards/testboard123")) return json(board());
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    if (url.endsWith("/api/v1/cards")) {
      creates++;
      assert.equal(body.listPublicId, "inboxlist123");
      assert.deepEqual(body.memberPublicIds, ["ownermember1"]);
      assert.equal(body.dueDate, "2026-10-20T00:00:00.000Z");
      assert.match(String(body.description), /OpenWA source: [a-f0-9]{64}/);
      return json({ publicId: "createdcard1" });
    }
    assert.ok(url.endsWith("/api/sessions/test-session/messages/send-text"));
    sends++;
    assert.equal(body.chatId, "test-group@g.us");
    assert.ok(String(body.text).startsWith(REPLY_PREFIX));
    assert.match(String(body.text), /task.adrenaent.com\/cards\/createdcard1/);
    return json({ id: "reply-1" });
  };
  const bridge = new Bridge(config, mock);
  t.after(() => bridge.close());
  const message = parseMessage(envelope(), config)!;
  assert.equal(bridge.enqueue(message), true);
  assert.equal(bridge.enqueue(message), false);
  await bridge.drain();
  assert.equal(bridge.enqueue(message), false);
  await bridge.drain();
  assert.equal(creates, 1);
  assert.equal(sends, 1);
  assert.equal(bridge.job(messageKey(message))?.status, "done");
});

test("restart recovers ambiguous create by marker without a second POST", async (t) => {
  const config = configuration(t);
  const cards: {
    publicId: string;
    title: string;
    description: string | null;
  }[] = [];
  let creates = 0;
  let sends = 0;
  const mock: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/boards/testboard123")) return json(board(cards));
    if (url.endsWith("/api/v1/cards")) {
      creates++;
      const data = JSON.parse(String(init?.body)) as {
        title: string;
        description: string;
      };
      cards.push({ publicId: "createdcard1", ...data });
      throw new Error("simulated lost response");
    }
    sends++;
    return json({ id: "reply-1" });
  };
  const message = parseMessage(envelope(), config)!;
  let bridge = new Bridge(config, mock);
  bridge.enqueue(message);
  await bridge.drain();
  assert.equal(bridge.job(messageKey(message))?.phase, "creating");
  bridge.close();
  bridge = new Bridge(config, mock);
  t.after(() => bridge.close());
  await bridge.drain(Date.now() + 60_000);
  assert.equal(creates, 1);
  assert.equal(sends, 1);
  assert.equal(bridge.job(messageKey(message))?.status, "done");
});

test("uncertain create without marker exhausts bounded reads, never reposts", async (t) => {
  const config = configuration(t);
  let creates = 0;
  const mock: typeof fetch = async (input) => {
    if (String(input).endsWith("/boards/testboard123")) return json(board());
    creates++;
    throw new Error("connection lost");
  };
  const bridge = new Bridge(config, mock);
  t.after(() => bridge.close());
  const message = parseMessage(envelope(), config)!;
  bridge.enqueue(message);
  await bridge.drain();
  await bridge.drain(Date.now() + 60_000);
  await bridge.drain(Date.now() + 300_000);
  assert.equal(creates, 1);
  assert.equal(bridge.job(messageKey(message))?.status, "failed");
  assert.equal(bridge.job(messageKey(message))?.attempts, 3);
});

test("permanent API rejection stops while rate limits retry", async (t) => {
  const config = configuration(t);
  let reads = 0;
  const mock: typeof fetch = async () => {
    reads++;
    return json({}, reads === 1 ? 429 : 403);
  };
  const bridge = new Bridge(config, mock);
  t.after(() => bridge.close());
  const message = parseMessage(envelope("!tasks"), config)!;
  bridge.enqueue(message);
  await bridge.drain();
  assert.equal(bridge.job(messageKey(message))?.status, "pending");
  await bridge.drain(Date.now() + 60_000);
  assert.equal(bridge.job(messageKey(message))?.status, "failed");
  assert.equal(reads, 2);
});

test("cross-board done request never sends a task mutation", async (t) => {
  const config = configuration(t);
  let puts = 0;
  let reply = "";
  const mock: typeof fetch = async (input, init) => {
    if (init?.method === "PUT") puts++;
    if (String(input).endsWith("/boards/testboard123")) return json(board());
    reply = (JSON.parse(String(init?.body)) as { text: string }).text;
    return json({ id: "reply" });
  };
  const bridge = new Bridge(config, mock);
  t.after(() => bridge.close());
  bridge.enqueue(parseMessage(envelope("!done outsider1234"), config)!);
  await bridge.drain();
  assert.equal(puts, 0);
  assert.match(reply, /outside the test board/);
});

test("done moves only the verified board card to the configured done list", async (t) => {
  const config = configuration(t);
  let puts = 0;
  const mock: typeof fetch = async (input, init) => {
    if (String(input).endsWith("/boards/testboard123"))
      return json(
        board([{ publicId: "createdcard1", title: "Test", description: null }]),
      );
    if (init?.method === "PUT") {
      puts++;
      assert.equal(
        String(input),
        "https://task.adrenaent.com/api/v1/cards/createdcard1",
      );
      assert.deepEqual(JSON.parse(String(init.body)), {
        listPublicId: "completed123",
      });
    }
    return json({ id: "reply" });
  };
  const bridge = new Bridge(config, mock);
  t.after(() => bridge.close());
  bridge.enqueue(parseMessage(envelope("تم createdcard1"), config)!);
  await bridge.drain();
  assert.equal(puts, 1);
});

test("uncertain WhatsApp reply is never automatically sent twice", async (t) => {
  const config = configuration(t);
  let sends = 0;
  const mock: typeof fetch = async () => {
    sends++;
    throw new Error("reply delivery unknown");
  };
  let bridge = new Bridge(config, mock);
  const message = parseMessage(envelope("!help"), config)!;
  bridge.enqueue(message);
  await bridge.drain();
  bridge.close();
  bridge = new Bridge(config, mock);
  t.after(() => bridge.close());
  await bridge.drain(Date.now() + 300_000);
  assert.equal(sends, 1);
  assert.equal(
    bridge.job(messageKey(message))?.errorCode,
    "reply_delivery_uncertain",
  );
});

test("reply rate-limit retry uses its durable checkpoint without recreating a task", async (t) => {
  const config = configuration(t);
  let creates = 0;
  let sends = 0;
  const mock: typeof fetch = async (input) => {
    if (String(input).endsWith("/boards/testboard123")) return json(board());
    if (String(input).endsWith("/api/v1/cards")) {
      creates++;
      return json({ publicId: "createdcard1" });
    }
    sends++;
    return json({}, sends === 1 ? 429 : 200);
  };
  const bridge = new Bridge(config, mock);
  t.after(() => bridge.close());
  const message = parseMessage(envelope(), config)!;
  bridge.enqueue(message);
  await bridge.drain();
  assert.equal(bridge.job(messageKey(message))?.phase, "ready_reply");
  await bridge.drain(Date.now() + 60_000);
  assert.equal(creates, 1);
  assert.equal(sends, 2);
  assert.equal(bridge.job(messageKey(message))?.status, "done");
});

test("restart rejects queued commands after their board scope changes", async (t) => {
  const config = configuration(t);
  let calls = 0;
  const mock: typeof fetch = async () => {
    calls++;
    return json({});
  };
  const message = parseMessage(envelope(), config)!;
  let bridge = new Bridge(config, mock);
  bridge.enqueue(message);
  bridge.close();
  bridge = new Bridge(
    { ...config, tasks: { ...config.tasks, boardPublicId: "otherboard12" } },
    mock,
  );
  t.after(() => bridge.close());
  await bridge.drain();
  assert.equal(calls, 0);
  assert.equal(bridge.job(messageKey(message))?.errorCode, "scope_revoked");
});

test("restart during reply delivery preserves uncertainty without resending", async (t) => {
  const config = configuration(t);
  let calls = 0;
  const mock: typeof fetch = async () => {
    calls++;
    return json({});
  };
  const message = parseMessage(envelope("!help"), config)!;
  let bridge = new Bridge(config, mock);
  bridge.enqueue(message);
  bridge.db
    .prepare(
      "UPDATE jobs SET status='processing',phase='replying',reply=? WHERE id=?",
    )
    .run(`${REPLY_PREFIX}\nhelp`, messageKey(message));
  bridge.close();
  bridge = new Bridge(config, mock);
  t.after(() => bridge.close());
  await bridge.drain();
  assert.equal(calls, 0);
  assert.equal(
    bridge.job(messageKey(message))?.errorCode,
    "reply_delivery_uncertain",
  );
});

test("HTTP rejects invalid HMAC and health contains no secrets or identifiers", async (t) => {
  const config = configuration(t);
  const bridge = new Bridge(config, async () => {
    throw new Error("must not call network");
  });
  const server = createBridgeServer(bridge);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    bridge.close();
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}`;
  const response = await fetch(url + "/webhook", {
    method: "POST",
    headers: { "x-openwa-signature": "sha256=" + "0".repeat(64) },
    body: JSON.stringify(envelope()),
  });
  assert.equal(response.status, 401);
  const oversized = await fetch(url + "/webhook", {
    method: "POST",
    body: "x".repeat(65 * 1024),
  });
  assert.equal(oversized.status, 413);
  const health = await fetch(url + "/health");
  assert.deepEqual(await health.json(), { status: "ok", configured: true });
  assert.equal(
    bridge.db.prepare("SELECT COUNT(*) AS total FROM jobs").get()?.total,
    0,
  );
});

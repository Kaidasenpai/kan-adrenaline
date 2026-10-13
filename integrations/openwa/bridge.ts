import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, isAbsolute, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";

export const REPLY_PREFIX = "[Adrenaline Test]";
const MAX_BODY_BYTES = 64 * 1024;
const ID_PATTERN = /^[A-Za-z0-9_-]{12,64}$/;
const HELP =
  "Commands / الأوامر:\n!task Prepare stage layout | 2026-10-20\nمهمة تجهيز مخطط المسرح | 2026-10-20\n!tasks / مهام\n!done TASK_PUBLIC_ID / تم TASK_PUBLIC_ID\nDates are optional. Tasks go only to the test board.\nالتاريخ اختياري. تُضاف المهام إلى لوحة التجربة فقط.";

export interface Config {
  host: string;
  port: number;
  databasePath: string;
  webhookSecret: string;
  sessionId: string;
  allowedGroupIds: string[];
  allowedSenderIds: string[];
  allowFromMe: boolean;
  selfSenderId: string;
  maxAttempts: number;
  tasks: {
    baseUrl: string;
    apiKey: string;
    workspacePublicId: string;
    boardPublicId: string;
    inboxListPublicId: string;
    doneListPublicId: string;
    ownerMemberPublicId: string;
  };
  openwa: { baseUrl: string; apiKey: string };
}

interface Message {
  id: string;
  sessionId: string;
  groupId: string;
  senderId: string;
  body: string;
  receivedAt: string;
  fromMe: boolean;
  scope: string;
}

interface Job {
  id: string;
  message: string;
  status: string;
  phase: string;
  attempts: number;
  nextAttemptAt: number;
  reply: string | null;
  errorCode: string | null;
}

interface Card {
  publicId: string;
  title: string;
  description: string | null;
}

interface Board {
  publicId: string;
  workspace: {
    publicId: string;
    members: { publicId: string; status: string }[];
  };
  lists: { publicId: string; name: string; cards: Card[] }[];
}

export class BridgeError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly ambiguous: boolean;
  constructor(code: string, retryable = false, ambiguous = false) {
    super(code);
    this.code = code;
    this.retryable = retryable;
    this.ambiguous = ambiguous;
  }
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? (value as string[])
    : [];
}

export function loadConfig(path: string): Config {
  if (!isAbsolute(path)) throw new BridgeError("config_path_must_be_absolute");
  if ((statSync(path).mode & 0o077) !== 0)
    throw new BridgeError("config_requires_mode_0600");
  const raw = object(JSON.parse(readFileSync(path, "utf8")) as unknown);
  const tasks = object(raw.tasks);
  const openwa = object(raw.openwa);
  const config: Config = {
    host: process.env.HOST || string(raw.host) || "127.0.0.1",
    port: Number(raw.port ?? 18878),
    databasePath: string(raw.databasePath),
    webhookSecret: string(raw.webhookSecret),
    sessionId: string(raw.sessionId),
    allowedGroupIds: stringArray(raw.allowedGroupIds),
    allowedSenderIds: stringArray(raw.allowedSenderIds),
    allowFromMe: raw.allowFromMe === true,
    selfSenderId: string(raw.selfSenderId),
    maxAttempts: Number(raw.maxAttempts ?? 5),
    tasks: {
      baseUrl: string(tasks.baseUrl) || "https://task.adrenaent.com",
      apiKey: string(tasks.apiKey),
      workspacePublicId: string(tasks.workspacePublicId),
      boardPublicId: string(tasks.boardPublicId),
      inboxListPublicId: string(tasks.inboxListPublicId),
      doneListPublicId: string(tasks.doneListPublicId),
      ownerMemberPublicId: string(tasks.ownerMemberPublicId),
    },
    openwa: {
      baseUrl: string(openwa.baseUrl) || "http://127.0.0.1:3000",
      apiKey: string(openwa.apiKey),
    },
  };
  const integrationDirectory = dirname(fileURLToPath(import.meta.url));
  const repositoryDirectory = resolve(integrationDirectory, "../..");
  for (const protectedPath of [path, config.databasePath]) {
    if (
      !isAbsolute(protectedPath) ||
      resolve(protectedPath).startsWith(repositoryDirectory + "/")
    ) {
      throw new BridgeError("runtime_files_must_be_outside_repository");
    }
  }
  if (
    !Number.isInteger(config.port) ||
    config.port < 1 ||
    config.port > 65535
  ) {
    throw new BridgeError("invalid_port");
  }
  if (
    !Number.isInteger(config.maxAttempts) ||
    config.maxAttempts < 1 ||
    config.maxAttempts > 8
  ) {
    throw new BridgeError("invalid_max_attempts");
  }
  const tasksUrl = new URL(config.tasks.baseUrl);
  const openwaUrl = new URL(config.openwa.baseUrl);
  if (
    tasksUrl.origin !== "https://task.adrenaent.com" ||
    tasksUrl.pathname !== "/"
  ) {
    throw new BridgeError("tasks_origin_not_allowed");
  }
  if (
    !["http:", "https:"].includes(openwaUrl.protocol) ||
    openwaUrl.username ||
    openwaUrl.password
  ) {
    throw new BridgeError("invalid_openwa_url");
  }
  return config;
}

export function configured(config: Config): boolean {
  return (
    config.webhookSecret.length >= 32 &&
    Boolean(config.sessionId) &&
    config.allowedGroupIds.length > 0 &&
    config.allowedGroupIds.every((id) => id.endsWith("@g.us")) &&
    config.allowedSenderIds.length > 0 &&
    Boolean(config.tasks.apiKey && config.openwa.apiKey) &&
    [
      config.tasks.workspacePublicId,
      config.tasks.boardPublicId,
      config.tasks.inboxListPublicId,
      config.tasks.doneListPublicId,
      config.tasks.ownerMemberPublicId,
    ].every((id) => ID_PATTERN.test(id)) &&
    config.tasks.inboxListPublicId !== config.tasks.doneListPublicId &&
    (!config.allowFromMe ||
      config.allowedSenderIds.includes(config.selfSenderId))
  );
}

export function validSignature(
  rawBody: Buffer,
  signature: string,
  secret: string,
): boolean {
  if (secret.length < 32 || !/^sha256=[a-f0-9]{64}$/i.test(signature))
    return false;
  const supplied = Buffer.from(signature.slice(7), "hex");
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

export function parseMessage(input: unknown, config: Config): Message | null {
  if (!configured(config)) return null;
  const envelope = object(input);
  const data = object(envelope.data);
  if (
    !["message.received", "message.sent"].includes(string(envelope.event)) ||
    envelope.sessionId !== config.sessionId
  )
    return null;
  if (
    data.isGroup !== true ||
    !config.allowedGroupIds.includes(string(data.chatId))
  )
    return null;
  if (data.type !== "text") return null;
  if (typeof data.fromMe !== "boolean") return null;
  // OpenWA reports commands composed on the linked phone as message.sent.
  // Only that explicitly enabled account may enter through the sent path.
  if (envelope.event === "message.sent" && !data.fromMe) return null;
  if (data.fromMe && !config.allowFromMe) return null;
  const senderId = data.fromMe ? config.selfSenderId : string(data.author);
  if (!senderId || !config.allowedSenderIds.includes(senderId)) return null;
  const body = string(data.body).trim();
  const id = string(data.id);
  if (
    !id ||
    id.length > 1024 ||
    !body ||
    body.length > 4000 ||
    body.startsWith(REPLY_PREFIX)
  )
    return null;
  if (
    !/^(?:!(?:task|tasks|done|help)|!?مهمة|!?مهام|!?تم|!?مساعدة)(?:\s|$)/iu.test(
      body,
    )
  )
    return null;
  return {
    id,
    sessionId: config.sessionId,
    groupId: string(data.chatId),
    senderId,
    body,
    receivedAt: new Date().toISOString(),
    fromMe: data.fromMe,
    scope: targetScope(config),
  };
}

function targetScope(config: Config): string {
  const tasks = config.tasks;
  return createHash("sha256")
    .update(
      JSON.stringify([
        tasks.workspacePublicId,
        tasks.boardPublicId,
        tasks.inboxListPublicId,
        tasks.doneListPublicId,
        tasks.ownerMemberPublicId,
      ]),
    )
    .digest("hex");
}

function messageAllowed(message: Message, config: Config): boolean {
  return (
    configured(config) &&
    message.sessionId === config.sessionId &&
    config.allowedGroupIds.includes(message.groupId) &&
    config.allowedSenderIds.includes(message.senderId) &&
    message.scope === targetScope(config) &&
    (!message.fromMe ||
      (config.allowFromMe && message.senderId === config.selfSenderId))
  );
}

export function messageKey(message: Message): string {
  return createHash("sha256")
    .update(JSON.stringify([message.sessionId, message.id, "message.received"]))
    .digest("hex");
}

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}

export class Bridge {
  readonly config: Config;
  readonly db: DatabaseSync;
  readonly fetcher: typeof fetch;
  private running = false;
  private stopped = false;
  private closed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(config: Config, fetcher: typeof fetch = fetch) {
    this.config = config;
    this.fetcher = fetcher;
    mkdirSync(dirname(config.databasePath), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(config.databasePath);
    chmodSync(config.databasePath, 0o600);
    this.db.exec(`PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
        phase TEXT NOT NULL DEFAULT 'new', attempts INTEGER NOT NULL DEFAULT 0,
        nextAttemptAt INTEGER NOT NULL DEFAULT 0, reply TEXT, errorCode TEXT
      );
      UPDATE jobs SET status='pending' WHERE status='processing';`);
    // A crash during send may mean the reply was delivered. Do not send it twice.
    this.db
      .prepare(
        "UPDATE jobs SET status='failed',errorCode='reply_delivery_uncertain' WHERE phase='replying' AND status='pending'",
      )
      .run();
  }

  enqueue(message: Message): boolean {
    const inserted = this.db
      .prepare("INSERT OR IGNORE INTO jobs (id,message) VALUES (?,?)")
      .run(messageKey(message), JSON.stringify(message));
    return inserted.changes > 0;
  }

  job(id: string): Job | undefined {
    return this.db.prepare("SELECT * FROM jobs WHERE id=?").get(id) as
      | Job
      | undefined;
  }

  private patch(
    id: string,
    status: string,
    phase: string,
    reply: string | null = null,
  ): void {
    this.db
      .prepare(
        "UPDATE jobs SET status=?,phase=?,reply=COALESCE(?,reply) WHERE id=?",
      )
      .run(status, phase, reply, id);
  }

  private async request<T>(
    path: string,
    body?: unknown,
    openwa = false,
  ): Promise<T> {
    const endpoint = openwa ? this.config.openwa : this.config.tasks;
    let response: Response;
    try {
      response = await this.fetcher(
        endpoint.baseUrl.replace(/\/$/, "") + path,
        {
          method: body === undefined ? "GET" : "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": endpoint.apiKey,
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(20_000),
          redirect: "error",
        },
      );
    } catch {
      throw new BridgeError("network_uncertain", true, body !== undefined);
    }
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new BridgeError(
        `http_${response.status}`,
        retryable,
        body !== undefined && response.status >= 500,
      );
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw new BridgeError("invalid_response", true, body !== undefined);
    }
  }

  private async board(): Promise<Board> {
    const board = await this.request<Board>(
      `/api/v1/boards/${this.config.tasks.boardPublicId}`,
    );
    const { tasks } = this.config;
    if (
      board.publicId !== tasks.boardPublicId ||
      board.workspace?.publicId !== tasks.workspacePublicId ||
      !Array.isArray(board.lists) ||
      !Array.isArray(board.workspace.members) ||
      !board.lists.some((list) => list.publicId === tasks.inboxListPublicId) ||
      !board.lists.some((list) => list.publicId === tasks.doneListPublicId) ||
      !board.workspace.members.some(
        (member) =>
          member.publicId === tasks.ownerMemberPublicId &&
          member.status === "active",
      )
    ) {
      throw new BridgeError("board_scope_mismatch");
    }
    return board;
  }

  private async createTask(
    job: Job,
    message: Message,
    argumentsText: string,
  ): Promise<string> {
    const parts = argumentsText.split("|").map((part) => part.trim());
    const title = parts[0] || "";
    if (!title || title.length > 300 || parts.length > 2) return HELP;
    let dueDate: string | undefined;
    if (parts.length === 2) {
      const date = parts[1]!;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        return "Use YYYY-MM-DD for the date.\nاكتب التاريخ بهذا الشكل: 2026-10-20";
      const parsed = new Date(date + "T00:00:00.000Z");
      if (
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== date
      )
        return "Invalid date.\nالتاريخ غير صحيح.";
      dueDate = parsed.toISOString();
    }
    const board = await this.board();
    const marker = `OpenWA source: ${job.id}`;
    let card = board.lists
      .flatMap((list) => list.cards)
      .find((candidate) => candidate.description?.includes(marker));
    if (!card) {
      // Once a POST was attempted, never blindly repeat it: a timeout may hide a successful create.
      if (job.phase === "creating")
        throw new BridgeError("create_delivery_uncertain", true);
      this.patch(job.id, "processing", "creating");
      try {
        card = await this.request<Card>("/api/v1/cards", {
          title,
          description: `<p>Created from the Adrenaline WhatsApp test group.</p><p>Sender: ${escapeHtml(message.senderId)}<br>Received: ${escapeHtml(message.receivedAt)}</p><p>${marker}</p>`,
          listPublicId: this.config.tasks.inboxListPublicId,
          labelPublicIds: [],
          memberPublicIds: [this.config.tasks.ownerMemberPublicId],
          position: "end",
          ...(dueDate ? { dueDate } : {}),
        });
        if (!ID_PATTERN.test(card.publicId))
          throw new BridgeError("invalid_create_response", true, true);
      } catch (error) {
        if (error instanceof BridgeError && !error.ambiguous)
          this.patch(job.id, "processing", "new");
        throw error;
      }
    }
    return `Task created / تمت إضافة المهمة\n${title}\n${this.config.tasks.baseUrl}/cards/${card.publicId}${dueDate ? `\nDue / الموعد: ${dueDate.slice(0, 10)}` : ""}`;
  }

  private async completeTask(cardId: string): Promise<string> {
    if (!ID_PATTERN.test(cardId)) return HELP;
    const board = await this.board();
    const list = board.lists.find((candidate) =>
      candidate.cards.some((card) => card.publicId === cardId),
    );
    if (!list)
      return "That task is outside the test board.\nهذه المهمة ليست ضمن لوحة التجربة.";
    const card = list.cards.find((candidate) => candidate.publicId === cardId)!;
    if (list.publicId !== this.config.tasks.doneListPublicId) {
      let response: Response;
      try {
        response = await this.fetcher(
          `${this.config.tasks.baseUrl}/api/v1/cards/${cardId}`,
          {
            method: "PUT",
            headers: {
              "content-type": "application/json",
              "x-api-key": this.config.tasks.apiKey,
            },
            body: JSON.stringify({
              listPublicId: this.config.tasks.doneListPublicId,
            }),
            signal: AbortSignal.timeout(20_000),
            redirect: "error",
          },
        );
      } catch {
        throw new BridgeError("network_uncertain", true);
      }
      if (!response.ok)
        throw new BridgeError(
          `http_${response.status}`,
          response.status === 429 || response.status >= 500,
        );
    }
    return `Completed / تم إنجاز المهمة\n${card.title.slice(0, 300)}\n${this.config.tasks.baseUrl}/cards/${card.publicId}`;
  }

  private async execute(job: Job): Promise<string> {
    const message = JSON.parse(job.message) as Message;
    // Re-check current configuration before replaying a job after an account/group configuration change.
    if (!messageAllowed(message, this.config))
      throw new BridgeError("scope_revoked");
    const command = message.body.match(/^(\S+)(?:\s+([\s\S]*))?$/u)!;
    const name = command[1]!.replace(/^!/, "").toLowerCase();
    const argument = (command[2] || "").trim();
    if (name === "task" || name === "مهمة")
      return this.createTask(job, message, argument);
    if (name === "done" || name === "تم") return this.completeTask(argument);
    if (name === "tasks" || name === "مهام") {
      const board = await this.board();
      const lines = board.lists
        .filter((list) => list.publicId !== this.config.tasks.doneListPublicId)
        .flatMap((list) =>
          list.cards.map(
            (card) =>
              `${list.name}: ${card.title.slice(0, 100)}\n${this.config.tasks.baseUrl}/cards/${card.publicId}`,
          ),
        );
      return lines.length
        ? `Open test tasks / مهام التجربة المفتوحة (${lines.length})\n\n${lines.slice(0, 8).join("\n\n")}`
        : "No open test tasks.\nلا توجد مهام مفتوحة في لوحة التجربة.";
    }
    return HELP;
  }

  async drain(now = Date.now()): Promise<void> {
    if (this.running || this.stopped) return;
    this.running = true;
    try {
      let job: Job | undefined;
      while (
        !this.stopped &&
        (job = this.db
          .prepare(
            "SELECT * FROM jobs WHERE status='pending' AND nextAttemptAt<=? ORDER BY rowid LIMIT 1",
          )
          .get(now) as Job | undefined)
      ) {
        this.db
          .prepare(
            "UPDATE jobs SET status='processing',attempts=attempts+1 WHERE id=?",
          )
          .run(job.id);
        try {
          const message = JSON.parse(job.message) as Message;
          if (!messageAllowed(message, this.config))
            throw new BridgeError("scope_revoked");
          const reply =
            job.reply ??
            `${REPLY_PREFIX}\n${await this.execute(job)}`.slice(0, 3800);
          this.patch(job.id, "processing", "ready_reply", reply);
          this.patch(job.id, "processing", "replying");
          try {
            await this.request(
              `/api/sessions/${encodeURIComponent(this.config.sessionId)}/messages/send-text`,
              { chatId: message.groupId, text: reply },
              true,
            );
          } catch (error) {
            if (error instanceof BridgeError && !error.ambiguous)
              this.patch(job.id, "processing", "ready_reply");
            else throw new BridgeError("reply_delivery_uncertain");
            throw error;
          }
          this.patch(job.id, "done", "complete");
        } catch (error) {
          const problem =
            error instanceof BridgeError
              ? error
              : new BridgeError("processing_failed");
          const attempts = job.attempts + 1;
          const retry = problem.retryable && attempts < this.config.maxAttempts;
          this.db
            .prepare(
              "UPDATE jobs SET status=?,nextAttemptAt=?,errorCode=? WHERE id=?",
            )
            .run(
              retry ? "pending" : "failed",
              now + Math.min(300_000, 30_000 * 2 ** (attempts - 1)),
              problem.code,
              job.id,
            );
        }
      }
    } finally {
      this.running = false;
    }
  }

  wake(): void {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    void this.drain()
      .then(() => {
        if (this.stopped) return;
        const next = this.db
          .prepare(
            "SELECT MIN(nextAttemptAt) AS next FROM jobs WHERE status='pending'",
          )
          .get() as { next: number | null };
        if (next.next !== null)
          this.timer = setTimeout(
            () => this.wake(),
            Math.max(100, next.next - Date.now()),
          );
      })
      .catch(() => {
        // Only a fixed error code is logged; never include request contents or credentials.
        process.stderr.write("bridge_queue_error\n");
      });
  }

  close(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    if (!this.closed) this.db.close();
    this.closed = true;
  }

  async shutdown(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    while (this.running)
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    this.close();
  }
}

async function rawBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as string);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new BridgeError("body_too_large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function respond(response: ServerResponse, status: number, body: object): void {
  response.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

export function createBridgeServer(bridge: Bridge) {
  return createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      respond(response, 200, {
        status: "ok",
        configured: configured(bridge.config),
      });
      return;
    }
    if (request.method !== "POST" || request.url !== "/webhook") {
      respond(response, 404, { error: "not_found" });
      return;
    }
    if (!configured(bridge.config)) {
      respond(response, 503, { error: "not_configured" });
      return;
    }
    try {
      const body = await rawBody(request);
      const signature = request.headers["x-openwa-signature"];
      if (
        typeof signature !== "string" ||
        !validSignature(body, signature, bridge.config.webhookSecret)
      ) {
        respond(response, 401, { error: "invalid_signature" });
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(body.toString("utf8")) as unknown;
      } catch {
        respond(response, 400, { error: "invalid_json" });
        return;
      }
      const message = parseMessage(parsed, bridge.config);
      if (message) bridge.enqueue(message);
      respond(response, 202, { accepted: true });
      if (message) bridge.wake();
    } catch (error) {
      respond(
        response,
        error instanceof BridgeError && error.code === "body_too_large"
          ? 413
          : 500,
        { error: "request_rejected" },
      );
    }
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const path = process.env.ADRENALINE_OPENWA_CONFIG;
    if (!path) throw new BridgeError("ADRENALINE_OPENWA_CONFIG_required");
    const config = loadConfig(path);
    const bridge = new Bridge(config);
    const server = createBridgeServer(bridge);
    server.requestTimeout = 15_000;
    server.headersTimeout = 10_000;
    server.listen(config.port, config.host, () => {
      process.stdout.write("Adrenaline OpenWA bridge started\n");
      bridge.wake();
    });
    server.on("error", () => {
      process.stderr.write("bridge_server_error\n");
      process.exitCode = 1;
    });
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
      process.once(signal, () => {
        server.close(() => {
          void bridge.shutdown();
        });
      });
    }
  } catch (error) {
    process.stderr.write(
      `${error instanceof BridgeError ? error.code : "bridge_startup_failed"}\n`,
    );
    process.exitCode = 1;
  }
}

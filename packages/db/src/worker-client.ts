import { AsyncLocalStorage } from "node:async_hooks";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { createLogger } from "@kan/logger";

import * as schema from "./schema";

export type dbClient = NodePgDatabase<typeof schema> & { $client: Pool };

interface RequestDatabase {
  connectionString: string;
  db?: dbClient;
  closing?: boolean;
}
const log = createLogger("worker-database");
const storageKey = Symbol.for("adrenaline.request-database");
const shared = globalThis as typeof globalThis & {
  [storageKey]?: AsyncLocalStorage<RequestDatabase>;
};
// OpenNext and the custom Worker bundle this module independently. The symbol
// ensures that both copies use the same request-local store in this isolate.
const storage = (shared[storageKey] ??=
  new AsyncLocalStorage<RequestDatabase>());

export function createDrizzleClient(): dbClient {
  const request = storage.getStore();
  if (!request) throw new Error("Database access requires an active request");
  if (!request.connectionString) throw new Error("POSTGRES_URL is required");
  if (!request.db) {
    const pool = new Pool({
      connectionString: request.connectionString,
      max: 2,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 1000,
    });
    // pg-cloudflare may emit a late reader error after a deliberate pool close.
    // Handle idle errors without logging the Client (which contains credentials).
    pool.on("error", (error: Error) => {
      if (request.closing && error.message.includes("socket has been closed"))
        return;
      log.warn({ message: error.message }, "Idle database connection failed");
    });
    request.db = drizzle(pool, { schema });
  }
  return request.db;
}

export async function withWorkerDatabase<T>(
  connectionString: string,
  handler: () => Promise<T>,
  waitUntil: (promise: Promise<unknown>) => void,
): Promise<T> {
  const request: RequestDatabase = { connectionString };
  return storage.run(request, async () => {
    try {
      return await handler();
    } finally {
      if (request.db) {
        request.closing = true;
        waitUntil(request.db.$client.end());
      }
    }
  });
}

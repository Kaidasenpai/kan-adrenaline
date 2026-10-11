import { describe, expect, it, vi } from "vitest";

import { createDrizzleClient, withWorkerDatabase } from "./worker-client";

const pools = vi.hoisted(() => [] as { end: ReturnType<typeof vi.fn> }[]);
vi.mock("pg", () => ({
  Pool: class {
    on = vi.fn();
    end = vi.fn(() => Promise.resolve());
    constructor() {
      pools.push(this);
    }
  },
}));
vi.mock("drizzle-orm/node-postgres", () => ({
  drizzle: ($client: unknown) => ({ $client }),
}));
vi.mock("./schema", () => ({}));

describe("Worker request databases", () => {
  it("rejects database access outside a request", () => {
    expect(() => createDrizzleClient()).toThrow("active request");
  });
  it("keeps concurrent requests isolated and reuses each request's pool", async () => {
    const cleanup: Promise<unknown>[] = [];
    const requests = await Promise.all(
      ["one", "two"].map((name) =>
        withWorkerDatabase(
          name,
          async () => {
            const first = createDrizzleClient();
            await Promise.resolve();
            expect(createDrizzleClient()).toBe(first);
            return first;
          },
          (promise) => cleanup.push(promise),
        ),
      ),
    );
    expect(requests[0]).not.toBe(requests[1]);
    await Promise.all(cleanup);
    for (const pool of pools.slice(-2)) expect(pool.end).toHaveBeenCalledOnce();
  });
  it("closes the pool when the handler fails", async () => {
    const cleanup: Promise<unknown>[] = [];
    await expect(
      withWorkerDatabase(
        "test",
        () => {
          createDrizzleClient();
          return Promise.reject(new Error("handler failed"));
        },
        (promise) => cleanup.push(promise),
      ),
    ).rejects.toThrow("handler failed");
    await Promise.all(cleanup);
    expect(pools.at(-1)?.end).toHaveBeenCalledOnce();
  });
  it("does not open a connection for requests that only serve a page", async () => {
    const count = pools.length;
    const cleanup = vi.fn();
    await withWorkerDatabase("test", () => Promise.resolve("page"), cleanup);
    expect(pools).toHaveLength(count);
    expect(cleanup).not.toHaveBeenCalled();
  });
});

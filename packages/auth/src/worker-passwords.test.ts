import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import type { dbClient } from "@kan/db/client";

import { workerPasswords } from "./worker-passwords";

describe("database password hashing", () => {
  it("uses parameterized hashing and prehashes passwords longer than bcrypt's input limit", async () => {
    const query = vi
      .fn<
        (sql: string, values: string[]) => Promise<{ rows: { hash: string }[] }>
      >()
      .mockResolvedValue({ rows: [{ hash: "$2a$12$example" }] });
    const passwords = workerPasswords({
      $client: { query },
    } as unknown as dbClient);
    const first = "x".repeat(72) + "first";
    const second = "x".repeat(72) + "second";
    expect(await passwords.hash(first)).toBe(
      "adrenaline-bcrypt-sha256:$2a$12$example",
    );
    await passwords.hash(second);
    expect(query.mock.calls[0]?.[1]).toEqual([
      createHash("sha256").update(first).digest("base64"),
    ]);
    expect(query.mock.calls[0]?.[1]).not.toEqual(query.mock.calls[1]?.[1]);
  });
  it("rejects hashes outside the expected format without querying the database", async () => {
    const query = vi.fn();
    const passwords = workerPasswords({
      $client: { query },
    } as unknown as dbClient);
    expect(
      await passwords.verify({ hash: "unknown", password: "example" }),
    ).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });
});

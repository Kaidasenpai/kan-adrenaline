import { createHash } from "node:crypto";

import type { dbClient } from "@kan/db/client";

const prefix = "adrenaline-bcrypt-sha256:";
const prepare = (password: string) =>
  createHash("sha256").update(password.normalize("NFKC")).digest("base64");

// Run the expensive password KDF in PostgreSQL, outside Workers' 10ms CPU
// budget. SHA-256 prehashing avoids bcrypt's 72-byte password truncation.
export function workerPasswords(db: dbClient) {
  return {
    hash: async (password: string): Promise<string> => {
      const result = await db.$client.query<{ hash: string }>(
        "SELECT crypt($1, gen_salt('bf', 12)) AS hash",
        [prepare(password)],
      );
      const hash = result.rows[0]?.hash;
      if (!hash) throw new Error("Password hashing failed");
      return prefix + hash;
    },
    verify: async ({ hash, password }: { hash: string; password: string }) => {
      if (!hash.startsWith(prefix)) return false;
      const value = hash.slice(prefix.length);
      const result = await db.$client.query<{ valid: boolean }>(
        "SELECT crypt($1, $2) = $2 AS valid",
        [prepare(password), value],
      );
      return result.rows[0]?.valid === true;
    },
  };
}

import { describe, expect, it, vi } from "vitest";

import type { dbClient } from "@kan/db/client";

import { hasWorkerInvitation } from "./worker-invites";

const baseURL = "https://task.adrenaent.com";
const callbackURL = "/invite/abcdefgh1234";
function database(valid: boolean) {
  const query = vi.fn().mockResolvedValue({ rows: [{ valid }] });
  return { db: { $client: { query } } as unknown as dbClient, query };
}
describe("closed Worker registration", () => {
  it("permits only an invitation validated by the database", async () => {
    const { db, query } = database(true);
    expect(
      await hasWorkerInvitation(db, { body: { callbackURL } }, baseURL),
    ).toBe(true);
    expect(query.mock.calls[0]?.[1]).toEqual(["abcdefgh1234"]);
  });
  it("rejects expired, revoked, or missing invitations", async () => {
    const { db } = database(false);
    expect(
      await hasWorkerInvitation(db, { body: { callbackURL } }, baseURL),
    ).toBe(false);
  });
  it("rejects foreign origins and fabricated callback paths before querying", async () => {
    const { db, query } = database(true);
    for (const callback of [
      "https://other.example/invite/abcdefgh1234",
      "/boards",
      "/invite/short",
      "/invite/abcdefgh1234/extra",
    ]) {
      expect(
        await hasWorkerInvitation(
          db,
          { body: { callbackURL: callback } },
          baseURL,
        ),
      ).toBe(false);
    }
    expect(await hasWorkerInvitation(db, undefined, baseURL)).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });
});

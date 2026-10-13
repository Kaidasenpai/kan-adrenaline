import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { dbClient } from "../client";
import * as schema from "../schema";
import {
  createInviteLink,
  getActiveForWorkspace,
  getByCode,
  replaceActiveForWorkspace,
} from "./inviteLink.repo";

describe("workspace invitation replacement", () => {
  let client: PGlite;
  let db: dbClient;
  let workspaceId: number;
  let otherWorkspaceId: number;
  const userId = "00000000-0000-4000-8000-000000000001";
  const expiresAt = new Date("2099-01-08T12:00:00.000Z");

  beforeAll(async () => {
    client = new PGlite({ extensions: { pg_trgm, uuid_ossp } });
    const testDb = drizzle(client, { schema });
    await migrate(testDb, {
      migrationsFolder: fileURLToPath(
        new URL("../../migrations/", import.meta.url),
      ),
    });
    // Repositories use the same PostgreSQL query API with PGlite in tests.
    db = testDb as unknown as dbClient;
  }, 30000);

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    await client.exec('TRUNCATE "user", workspace RESTART IDENTITY CASCADE');
    await db.insert(schema.users).values({
      id: userId,
      email: "invite-test@example.com",
      emailVerified: true,
    });
    const workspaces = await db
      .insert(schema.workspaces)
      .values([
        {
          publicId: "workspace001",
          name: "Invitation test",
          slug: "invitation-test",
          createdBy: userId,
        },
        {
          publicId: "workspace002",
          name: "Other workspace",
          slug: "other-workspace",
          createdBy: userId,
        },
      ])
      .returning({ id: schema.workspaces.id });
    const [workspace, otherWorkspace] = workspaces;
    if (!workspace || !otherWorkspace)
      throw new Error("Test workspaces missing");
    workspaceId = workspace.id;
    otherWorkspaceId = otherWorkspace.id;
  });

  const invitation = (code: string, targetWorkspaceId = workspaceId) => ({
    workspaceId: targetWorkspaceId,
    code,
    expiresAt,
    createdBy: userId,
  });

  it("replaces the workspace link while preserving expiry and other workspaces", async () => {
    await createInviteLink(db, invitation("previous0001"));
    await createInviteLink(db, invitation("unrelated001", otherWorkspaceId));

    const replacement = await replaceActiveForWorkspace(
      db,
      invitation("replacement1"),
    );

    expect(replacement).toMatchObject({
      code: "replacement1",
      status: "active",
      expiresAt,
    });
    expect(replacement.publicId).toHaveLength(12);
    expect(await getByCode(db, "previous0001")).toMatchObject({
      status: "inactive",
      updatedBy: userId,
    });
    expect(await getActiveForWorkspace(db, otherWorkspaceId)).toMatchObject({
      code: "unrelated001",
      status: "active",
    });
  });

  it("keeps the previous link usable when the replacement insert fails", async () => {
    await createInviteLink(db, invitation("previous0001"));
    await createInviteLink(db, invitation("duplicate001", otherWorkspaceId));

    await expect(
      replaceActiveForWorkspace(db, invitation("duplicate001")),
    ).rejects.toThrow();

    expect(await getActiveForWorkspace(db, workspaceId)).toMatchObject({
      code: "previous0001",
      status: "active",
      updatedAt: null,
      updatedBy: null,
    });
  });

  it("leaves one active link after overlapping replacement requests", async () => {
    const replacements = await Promise.all([
      replaceActiveForWorkspace(db, invitation("concurrent01")),
      replaceActiveForWorkspace(db, invitation("concurrent02")),
    ]);

    const activeLinks = await db
      .select({ code: schema.workspaceInviteLinks.code })
      .from(schema.workspaceInviteLinks)
      .where(
        and(
          eq(schema.workspaceInviteLinks.workspaceId, workspaceId),
          eq(schema.workspaceInviteLinks.status, "active"),
        ),
      );

    expect(replacements).toHaveLength(2);
    expect(activeLinks).toHaveLength(1);
    expect(replacements.map((link) => link.code)).toContain(
      activeLinks[0]?.code,
    );
  });
});

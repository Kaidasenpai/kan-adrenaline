import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { dbClient } from "../client";
import type { MemberStatus } from "../schema";
import * as schema from "../schema";

describe("migrated workspace membership constraints", () => {
  let client: PGlite;
  let db: dbClient;
  let workspaceId: number;
  let otherWorkspaceId: number;
  let memberSequence: number;
  const ownerId = "00000000-0000-4000-8000-000000000001";
  const teammateId = "00000000-0000-4000-8000-000000000002";

  beforeAll(async () => {
    client = new PGlite({ extensions: { pg_trgm, uuid_ossp } });
    const testDb = drizzle(client, { schema });
    await migrate(testDb, {
      migrationsFolder: fileURLToPath(
        new URL("../../migrations/", import.meta.url),
      ),
    });
    db = testDb as unknown as dbClient;
  }, 30000);

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    await client.exec('TRUNCATE "user", workspace RESTART IDENTITY CASCADE');
    memberSequence = 0;
    await db.insert(schema.users).values([
      { id: ownerId, email: "owner@example.com", emailVerified: true },
      { id: teammateId, email: "teammate@example.com", emailVerified: true },
    ]);
    const workspaces = await db
      .insert(schema.workspaces)
      .values([
        {
          publicId: "workspace001",
          name: "Membership test",
          slug: "membership-test",
          createdBy: ownerId,
        },
        {
          publicId: "workspace002",
          name: "Other workspace",
          slug: "other-workspace",
          createdBy: ownerId,
        },
      ])
      .returning({ id: schema.workspaces.id });
    const [workspace, otherWorkspace] = workspaces;
    if (!workspace || !otherWorkspace)
      throw new Error("Test workspaces missing");
    workspaceId = workspace.id;
    otherWorkspaceId = otherWorkspace.id;
  });

  const insertMember = (args: {
    email: string;
    userId?: string | null;
    status?: MemberStatus;
    targetWorkspaceId?: number;
  }) => {
    memberSequence += 1;
    return db
      .insert(schema.workspaceMembers)
      .values({
        publicId: String(memberSequence).padStart(12, "0"),
        email: args.email,
        userId: args.userId ?? null,
        workspaceId: args.targetWorkspaceId ?? workspaceId,
        createdBy: ownerId,
        role: "member",
        status: args.status ?? "invited",
      })
      .returning();
  };

  it.each(["invited", "active", "paused"] as const)(
    "rejects a second %s membership for the same person despite a different email",
    async (status) => {
      await insertMember({
        email: "teammate@example.com",
        userId: teammateId,
        status: "active",
      });

      await expect(
        insertMember({
          email: "different-address@example.com",
          userId: teammateId,
          status,
        }),
      ).rejects.toMatchObject({
        code: "23505",
        constraint: "workspace_members_live_user_unique",
      });
    },
  );

  it("rejects a repeated pending invitation after folding email case and whitespace", async () => {
    await insertMember({ email: "Pending.Person@example.com" });

    await expect(
      insertMember({ email: "  pending.person@EXAMPLE.COM  " }),
    ).rejects.toMatchObject({
      code: "23505",
      constraint: "workspace_members_live_email_unique",
    });
  });

  it("allows the same person and email to belong to a separate workspace", async () => {
    await insertMember({
      email: "teammate@example.com",
      userId: teammateId,
      status: "active",
    });

    const [member] = await insertMember({
      email: "teammate@example.com",
      userId: teammateId,
      status: "active",
      targetWorkspaceId: otherWorkspaceId,
    });

    expect(member).toMatchObject({
      userId: teammateId,
      workspaceId: otherWorkspaceId,
      status: "active",
    });
  });

  it("allows a new invitation after soft deletion while retaining the former record", async () => {
    const [formerMember] = await insertMember({
      email: "teammate@example.com",
      userId: teammateId,
      status: "active",
    });
    if (!formerMember) throw new Error("Former member missing");
    const deletedAt = new Date("2026-10-13T10:00:00.000Z");
    await db
      .update(schema.workspaceMembers)
      .set({ deletedAt, deletedBy: ownerId })
      .where(eq(schema.workspaceMembers.id, formerMember.id));

    const [replacement] = await insertMember({
      email: " TEAMMATE@example.com ",
      userId: teammateId,
    });

    expect(replacement).toMatchObject({
      userId: teammateId,
      status: "invited",
      deletedAt: null,
    });
    expect(replacement?.id).not.toBe(formerMember.id);
    expect(
      await db.query.workspaceMembers.findFirst({
        where: eq(schema.workspaceMembers.id, formerMember.id),
      }),
    ).toMatchObject({ deletedAt, deletedBy: ownerId });
  });

  it("allows rejoining when only a removed membership remains in history", async () => {
    const [formerMember] = await insertMember({
      email: "teammate@example.com",
      userId: teammateId,
      status: "removed",
    });
    const [replacement] = await insertMember({
      email: "teammate@example.com",
      userId: teammateId,
      status: "active",
    });

    expect(formerMember).toMatchObject({ status: "removed", deletedAt: null });
    expect(replacement).toMatchObject({ status: "active", deletedAt: null });
    expect(replacement?.id).not.toBe(formerMember?.id);
  });

  it("allows different pending invitees whose user IDs are both null", async () => {
    await insertMember({ email: "first-invitee@example.com" });
    await insertMember({ email: "second-invitee@example.com" });

    const members = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.workspaceId, workspaceId),
    });
    expect(members).toHaveLength(2);
    expect(members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "first-invitee@example.com",
          userId: null,
          status: "invited",
        }),
        expect.objectContaining({
          email: "second-invitee@example.com",
          userId: null,
          status: "invited",
        }),
      ]),
    );
  });
});

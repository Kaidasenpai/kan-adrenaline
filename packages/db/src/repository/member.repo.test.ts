import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { dbClient } from "../client";
import * as schema from "../schema";
import { createInviteLink } from "./inviteLink.repo";
import { acceptInviteLink, create } from "./member.repo";
import { getByReferenceId } from "./subscription.repo";

describe("workspace invitation acceptance", () => {
  let client: PGlite;
  let db: dbClient;
  let workspaceId: number;
  const userId = "00000000-0000-4000-8000-000000000001";
  const email = "invite-test@example.com";
  const inviteCode = "invitation01";

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
    await db
      .insert(schema.users)
      .values({ id: userId, email, emailVerified: true });
    const [workspace] = await db
      .insert(schema.workspaces)
      .values({
        publicId: "workspace001",
        name: "Invitation test",
        slug: "invitation-test",
        createdBy: userId,
      })
      .returning({ id: schema.workspaces.id });
    if (!workspace) throw new Error("Test workspace missing");
    workspaceId = workspace.id;
    await createInviteLink(db, {
      code: inviteCode,
      workspaceId,
      expiresAt: new Date("2099-01-08T12:00:00.000Z"),
      createdBy: userId,
    });
  });

  const currentMembers = () =>
    db
      .select()
      .from(schema.workspaceMembers)
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          isNull(schema.workspaceMembers.deletedAt),
        ),
      );

  it("accepts concurrent requests once and skips repeated seat charges", async () => {
    const beforeCreate = vi.fn(
      async ({ db: transaction }: { db: Pick<dbClient, "query"> }) => {
        expect(await getByReferenceId(transaction, "workspace001")).toEqual([]);
      },
    );
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        acceptInviteLink(db, { inviteCode, userId, beforeCreate }),
      ),
    );

    expect(results.every((result) => result.status === "accepted")).toBe(true);
    expect(
      results.filter(
        (result) => result.status === "accepted" && result.created,
      ),
    ).toHaveLength(1);
    expect(await currentMembers()).toHaveLength(1);
    expect(beforeCreate).toHaveBeenCalledOnce();
    expect(beforeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        workspacePublicId: "workspace001",
        memberCount: 0,
      }),
    );
  });

  it("returns an existing active member without changing their role", async () => {
    const member = await create(db, {
      userId,
      email,
      workspaceId,
      createdBy: userId,
      role: "admin",
      status: "active",
    });
    const beforeCreate = vi.fn(() => Promise.resolve());

    const result = await acceptInviteLink(db, {
      inviteCode,
      userId,
      beforeCreate,
    });

    expect(result).toMatchObject({
      status: "accepted",
      created: false,
      memberPublicId: member?.publicId,
    });
    expect(await currentMembers()).toMatchObject([{ role: "admin" }]);
    expect(beforeCreate).not.toHaveBeenCalled();
  });

  it("reuses a pending email invitation and preserves its role and overrides", async () => {
    const member = await create(db, {
      userId: null,
      email: `  ${email.toUpperCase()}  `,
      workspaceId,
      createdBy: userId,
      role: "guest",
      status: "invited",
    });
    if (!member) throw new Error("Test member missing");
    await db.insert(schema.workspaceMemberPermissions).values({
      workspaceMemberId: member.id,
      permission: "card:create",
      granted: false,
    });
    const beforeCreate = vi.fn(() => Promise.resolve());

    await acceptInviteLink(db, { inviteCode, userId, beforeCreate });

    expect(await currentMembers()).toMatchObject([
      { publicId: member.publicId, userId, status: "active", role: "guest" },
    ]);
    const overrides = await db.select().from(schema.workspaceMemberPermissions);
    expect(overrides).toMatchObject([
      {
        workspaceMemberId: member.id,
        permission: "card:create",
        granted: false,
      },
    ]);
    expect(beforeCreate).not.toHaveBeenCalled();
  });

  it("does not restore paused membership through an invitation", async () => {
    await create(db, {
      userId,
      email,
      workspaceId,
      createdBy: userId,
      role: "member",
      status: "paused",
    });
    const beforeCreate = vi.fn(() => Promise.resolve());

    expect(
      await acceptInviteLink(db, { inviteCode, userId, beforeCreate }),
    ).toEqual({ status: "member_unavailable" });
    expect(await currentMembers()).toMatchObject([{ status: "paused" }]);
    expect(beforeCreate).not.toHaveBeenCalled();
  });

  it("rejects revoked and expired links before creating membership", async () => {
    const beforeCreate = vi.fn(() => Promise.resolve());
    await db
      .update(schema.workspaceInviteLinks)
      .set({ status: "inactive" })
      .where(eq(schema.workspaceInviteLinks.code, inviteCode));
    expect(
      await acceptInviteLink(db, { inviteCode, userId, beforeCreate }),
    ).toEqual({ status: "invalid_invite" });
    await db
      .update(schema.workspaceInviteLinks)
      .set({ status: "active", expiresAt: new Date("2000-01-01") })
      .where(eq(schema.workspaceInviteLinks.code, inviteCode));
    expect(
      await acceptInviteLink(db, { inviteCode, userId, beforeCreate }),
    ).toEqual({ status: "invalid_invite" });
    expect(await currentMembers()).toHaveLength(0);
    expect(beforeCreate).not.toHaveBeenCalled();
  });

  it("preserves soft-deleted membership history when joining again", async () => {
    const oldMember = await create(db, {
      userId,
      email,
      workspaceId,
      createdBy: userId,
      role: "member",
      status: "active",
    });
    if (!oldMember) throw new Error("Test member missing");
    await db
      .update(schema.workspaceMembers)
      .set({ deletedAt: new Date(), deletedBy: userId })
      .where(eq(schema.workspaceMembers.id, oldMember.id));

    const result = await acceptInviteLink(db, { inviteCode, userId });

    expect(result).toMatchObject({ status: "accepted", created: true });
    expect(await currentMembers()).toHaveLength(1);
    expect(await db.select().from(schema.workspaceMembers)).toHaveLength(2);
  });

  it("allows a fresh invitation after a legacy removed membership", async () => {
    await create(db, {
      userId,
      email,
      workspaceId,
      createdBy: userId,
      role: "member",
      status: "removed",
    });

    const result = await acceptInviteLink(db, { inviteCode, userId });

    expect(result).toMatchObject({ status: "accepted", created: true });
    expect(
      (await currentMembers()).map((member) => member.status).sort(),
    ).toEqual(["active", "removed"]);
  });

  it("creates no membership when the seat or billing check rejects", async () => {
    await expect(
      acceptInviteLink(db, {
        inviteCode,
        userId,
        beforeCreate: () => Promise.reject(new Error("Seat limit reached")),
      }),
    ).rejects.toThrow("Seat limit reached");
    expect(await currentMembers()).toHaveLength(0);
  });
});

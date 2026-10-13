import { and, asc, count, eq, isNull, ne, or, sql } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { MemberRole, MemberStatus } from "@kan/db/schema";
import {
  users,
  workspaceInviteLinks,
  workspaceMembers,
  workspaceRoles,
  workspaces,
} from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const getActiveCount = async (db: dbClient) => {
  const result = await db
    .select({ count: count() })
    .from(workspaceMembers)
    .where(
      and(
        isNull(workspaceMembers.deletedAt),
        eq(workspaceMembers.status, "active"),
      ),
    );

  return result[0]?.count ?? 0;
};

export const getCountByWorkspaceId = async (
  db: Pick<dbClient, "select">,
  workspaceId: number,
) => {
  const result = await db
    .select({ count: count() })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        isNull(workspaceMembers.deletedAt),
        or(
          eq(workspaceMembers.status, "active"),
          eq(workspaceMembers.status, "invited"),
        ),
      ),
    );

  return result[0]?.count ?? 0;
};

export const create = async (
  db: Pick<dbClient, "insert">,
  memberInput: {
    userId: string | null;
    email: string;
    workspaceId: number;
    createdBy: string;
    role: MemberRole;
    roleId?: number | null;
    status: MemberStatus;
  },
) => {
  const [result] = await db
    .insert(workspaceMembers)
    .values({
      publicId: generateUID(),
      email: memberInput.email,
      userId: memberInput.userId,
      workspaceId: memberInput.workspaceId,
      createdBy: memberInput.createdBy,
      role: memberInput.role,
      roleId: memberInput.roleId ?? null,
      status: memberInput.status,
    })
    .returning({
      id: workspaceMembers.id,
      publicId: workspaceMembers.publicId,
    });

  return result;
};

type InviteLinkAcceptanceResult =
  | {
      status: "accepted";
      created: boolean;
      memberPublicId: string;
      workspacePublicId: string;
      workspaceSlug: string;
    }
  | {
      status:
        | "invalid_invite"
        | "workspace_not_found"
        | "user_not_found"
        | "member_unavailable";
    };

export const acceptInviteLink = async (
  db: dbClient,
  args: {
    inviteCode: string;
    userId: string;
    beforeCreate?: (context: {
      db: Pick<dbClient, "query">;
      workspacePublicId: string;
      memberCount: number;
    }) => Promise<void>;
  },
): Promise<InviteLinkAcceptanceResult> => {
  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select({ workspaceId: workspaceInviteLinks.workspaceId })
      .from(workspaceInviteLinks)
      .where(eq(workspaceInviteLinks.code, args.inviteCode));
    if (!candidate) return { status: "invalid_invite" };

    // Serialize join attempts with invitation replacement, including the first
    // membership for a user when there is no member row available to lock.
    const [workspace] = await tx
      .select({
        id: workspaces.id,
        publicId: workspaces.publicId,
        slug: workspaces.slug,
      })
      .from(workspaces)
      .where(
        and(
          eq(workspaces.id, candidate.workspaceId),
          isNull(workspaces.deletedAt),
        ),
      )
      .for("update");
    if (!workspace) return { status: "workspace_not_found" };

    // Re-read after acquiring the lock: the administrator may have revoked or
    // replaced this invitation while this request was waiting.
    const [invite] = await tx
      .select()
      .from(workspaceInviteLinks)
      .where(eq(workspaceInviteLinks.code, args.inviteCode))
      .for("update");
    if (
      !invite ||
      invite.workspaceId !== workspace.id ||
      invite.status !== "active" ||
      (invite.expiresAt && invite.expiresAt.getTime() <= Date.now())
    )
      return { status: "invalid_invite" };

    const [user] = await tx
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, args.userId));
    if (!user) return { status: "user_not_found" };

    const [existing] = await tx
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspace.id),
          isNull(workspaceMembers.deletedAt),
          ne(workspaceMembers.status, "removed"),
          or(
            eq(workspaceMembers.userId, user.id),
            sql`lower(btrim(${workspaceMembers.email})) = lower(btrim(${user.email}))`,
          ),
        ),
      )
      .orderBy(asc(workspaceMembers.createdAt), asc(workspaceMembers.id))
      .limit(1)
      .for("update");

    const accepted = (memberPublicId: string, created: boolean) => ({
      status: "accepted" as const,
      created,
      memberPublicId,
      workspacePublicId: workspace.publicId,
      workspaceSlug: workspace.slug,
    });

    if (existing) {
      if (existing.userId && existing.userId !== user.id)
        return { status: "member_unavailable" };
      if (existing.status === "active" && existing.userId === user.id)
        return accepted(existing.publicId, false);
      if (existing.status !== "invited")
        return { status: "member_unavailable" };

      // Reuse an email invitation, preserving its role and permission overrides.
      // Invited memberships already count toward seats and were billed on invite.
      await tx
        .update(workspaceMembers)
        .set({ status: "active", userId: user.id, updatedAt: new Date() })
        .where(eq(workspaceMembers.id, existing.id));
      return accepted(existing.publicId, false);
    }

    const [role] = await tx
      .select({ id: workspaceRoles.id })
      .from(workspaceRoles)
      .where(
        and(
          eq(workspaceRoles.workspaceId, workspace.id),
          eq(workspaceRoles.name, "member"),
        ),
      );

    // Billing and seat checks run once under the lock, only for a new member.
    if (args.beforeCreate)
      await args.beforeCreate({
        db: tx,
        workspacePublicId: workspace.publicId,
        memberCount: await getCountByWorkspaceId(tx, workspace.id),
      });

    const member = await create(tx, {
      workspaceId: workspace.id,
      email: user.email,
      userId: user.id,
      createdBy: user.id,
      role: "member",
      roleId: role?.id ?? null,
      status: "active",
    });
    if (!member) throw new Error("Failed to create workspace membership");
    return accepted(member.publicId, true);
  });
};

export const getByPublicId = async (db: dbClient, publicId: string) => {
  return db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.publicId, publicId),
  });
};

export const getById = async (db: dbClient, memberId: number) => {
  return db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.id, memberId),
  });
};

export const getByPublicIdsWithUsers = async (
  db: dbClient,
  memberPublicIds: string[],
  workspaceId?: number,
) => {
  return db.query.workspaceMembers.findMany({
    where: (members, { inArray: inArrayFn, eq, and, isNull: isNullFn }) => {
      const conditions = [inArrayFn(members.publicId, memberPublicIds)];

      if (workspaceId) {
        conditions.push(eq(members.workspaceId, workspaceId));
      }

      conditions.push(eq(members.status, "active"));
      conditions.push(isNullFn(members.deletedAt));

      return and(...conditions);
    },
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const getByEmailAndStatus = async (
  db: dbClient,
  email: string,
  status: MemberStatus,
) => {
  return db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.email, email),
      eq(workspaceMembers.status, status),
      isNull(workspaceMembers.deletedAt),
    ),
  });
};

export const acceptInvite = async (
  db: dbClient,
  args: { memberId: number; userId: string },
) => {
  const [result] = await db
    .update(workspaceMembers)
    .set({ status: "active", userId: args.userId })
    .where(eq(workspaceMembers.id, args.memberId))
    .returning({
      id: workspaceMembers.id,
      publicId: workspaceMembers.publicId,
    });

  return result;
};

export const softDelete = async (
  db: dbClient,
  args: {
    memberId: number;
    deletedAt: Date;
    deletedBy: string;
  },
) => {
  const [result] = await db
    .update(workspaceMembers)
    .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
    .where(
      and(
        eq(workspaceMembers.id, args.memberId),
        isNull(workspaceMembers.deletedAt),
      ),
    )
    .returning({
      id: workspaceMembers.id,
      publicId: workspaceMembers.publicId,
    });

  return result;
};

export const unpauseAllMembers = async (db: dbClient, workspaceId: number) => {
  await db
    .update(workspaceMembers)
    .set({ status: "active" })
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.status, "paused"),
      ),
    );
};

export const pauseAllMembers = async (db: dbClient, workspaceId: number) => {
  await db
    .update(workspaceMembers)
    .set({ status: "paused" })
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.status, "active"),
      ),
    );
};

export const getPreservableMemberId = async (
  db: dbClient,
  workspaceId: number,
  ownerUserId: string | null,
): Promise<string | null> => {
  if (ownerUserId) {
    const owner = await db.query.workspaceMembers.findFirst({
      columns: { userId: true },
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, ownerUserId),
        eq(workspaceMembers.status, "active"),
        isNull(workspaceMembers.deletedAt),
      ),
    });
    if (owner?.userId) return owner.userId;
  }

  const admin = await db.query.workspaceMembers.findFirst({
    columns: { userId: true },
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.role, "admin"),
      eq(workspaceMembers.status, "active"),
      isNull(workspaceMembers.deletedAt),
    ),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
  if (admin?.userId) return admin.userId;

  const anyMember = await db.query.workspaceMembers.findFirst({
    columns: { userId: true },
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.status, "active"),
      isNull(workspaceMembers.deletedAt),
    ),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
  return anyMember?.userId ?? null;
};

export const pauseMembersExcept = async (
  db: dbClient,
  workspaceId: number,
  preserveUserId: string,
) => {
  await db
    .update(workspaceMembers)
    .set({ status: "paused" })
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.status, "active"),
        or(
          isNull(workspaceMembers.userId),
          ne(workspaceMembers.userId, preserveUserId),
        ),
      ),
    );
};

export const updateRole = async (
  db: dbClient,
  args: {
    memberId: number;
    role: MemberRole;
    roleId: number | null;
  },
) => {
  const [result] = await db
    .update(workspaceMembers)
    .set({
      role: args.role,
      roleId: args.roleId,
      updatedAt: new Date(),
    })
    .where(eq(workspaceMembers.id, args.memberId))
    .returning({
      id: workspaceMembers.id,
      publicId: workspaceMembers.publicId,
      role: workspaceMembers.role,
    });

  return result;
};

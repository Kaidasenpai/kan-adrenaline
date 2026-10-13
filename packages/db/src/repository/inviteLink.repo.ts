import { and, count, eq, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { workspaceInviteLinks, workspaces } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

interface CreateInviteLinkArgs {
  workspaceId: number;
  code: string;
  expiresAt: Date | null;
  createdBy: string;
}

export const getActiveCount = async (db: dbClient) => {
  const result = await db
    .select({ count: count() })
    .from(workspaceInviteLinks)
    .where(eq(workspaceInviteLinks.status, "active"));

  return result[0]?.count ?? 0;
};

export const createInviteLink = async (
  db: Pick<dbClient, "insert">,
  args: CreateInviteLinkArgs,
) => {
  const [result] = await db
    .insert(workspaceInviteLinks)
    .values({
      publicId: generateUID(),
      workspaceId: args.workspaceId,
      code: args.code,
      expiresAt: args.expiresAt ?? null,
      status: "active",
      createdBy: args.createdBy,
    })
    .returning({
      publicId: workspaceInviteLinks.publicId,
      code: workspaceInviteLinks.code,
      status: workspaceInviteLinks.status,
      expiresAt: workspaceInviteLinks.expiresAt,
    });
  return result;
};

export const deactivateAllActiveForWorkspace = async (
  db: Pick<dbClient, "update">,
  args: { workspaceId: number; updatedBy: string },
) => {
  await db
    .update(workspaceInviteLinks)
    .set({
      status: "inactive",
      updatedBy: args.updatedBy,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(workspaceInviteLinks.workspaceId, args.workspaceId),
        eq(workspaceInviteLinks.status, "active"),
      ),
    );
};

export const replaceActiveForWorkspace = async (
  db: dbClient,
  args: CreateInviteLinkArgs,
) => {
  return db.transaction(async (tx) => {
    // Lock the workspace even when it has no invitations, so simultaneous
    // replacements cannot both leave an active link behind.
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(
        and(eq(workspaces.id, args.workspaceId), isNull(workspaces.deletedAt)),
      )
      .for("update");

    if (!workspace) throw new Error("Workspace not found");

    await deactivateAllActiveForWorkspace(tx, {
      workspaceId: args.workspaceId,
      updatedBy: args.createdBy,
    });
    const inviteLink = await createInviteLink(tx, args);
    if (!inviteLink) throw new Error("Failed to create invite link");
    return inviteLink;
  });
};

export const getActiveForWorkspace = async (
  db: dbClient,
  workspaceId: number,
) => {
  return db.query.workspaceInviteLinks.findFirst({
    where: and(
      eq(workspaceInviteLinks.workspaceId, workspaceId),
      eq(workspaceInviteLinks.status, "active"),
    ),
    orderBy: (links, { desc }) => [desc(links.createdAt)],
  });
};

export const getByCode = async (db: dbClient, code: string) => {
  return db.query.workspaceInviteLinks.findFirst({
    where: eq(workspaceInviteLinks.code, code),
  });
};

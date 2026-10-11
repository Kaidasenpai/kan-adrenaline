import type { dbClient } from "@kan/db/client";

// Closed registration can accept a bearer invitation created by an admin.
// Checking the database prevents fabricated, revoked, or expired links from
// granting registration access. A callback on another origin is never trusted.
export async function hasWorkerInvitation(
  db: dbClient,
  context: unknown,
  baseURL: string | undefined,
): Promise<boolean> {
  if (
    !baseURL ||
    !context ||
    typeof context !== "object" ||
    !("body" in context)
  )
    return false;
  const body = context.body;
  if (
    !body ||
    typeof body !== "object" ||
    !("callbackURL" in body) ||
    typeof body.callbackURL !== "string"
  )
    return false;
  let url: URL;
  try {
    url = new URL(body.callbackURL, baseURL);
  } catch {
    return false;
  }
  if (url.origin !== new URL(baseURL).origin) return false;
  const code = /^\/invite\/([A-Za-z0-9_-]{12})$/.exec(url.pathname)?.[1];
  if (!code) return false;
  const result = await db.$client.query<{ valid: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM workspace_invite_links AS invitation
      JOIN workspace AS workspace ON workspace.id = invitation."workspaceId"
      WHERE invitation.code = $1 AND invitation.status = 'active'
        AND (invitation."expiresAt" IS NULL OR invitation."expiresAt" > now())
        AND workspace."deletedAt" IS NULL
    ) AS valid`,
    [code],
  );
  return result.rows[0]?.valid === true;
}

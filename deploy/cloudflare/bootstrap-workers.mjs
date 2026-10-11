import { randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { createLogger } from "../../packages/logger/src/index.ts";
import { getDefaultPermissions } from "../../packages/shared/src/permissions.ts";

const log = createLogger("workers-bootstrap");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error("Supply the intended workspace owner's email address");
}
const secrets = Object.fromEntries(
  (await readFile(resolve(root, "apps/web/.dev.vars"), "utf8"))
    .split("\n")
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), JSON.parse(line.slice(index + 1))];
    }),
);
const connectionString = secrets.POSTGRES_URL?.replace("-pooler.", ".");
if (!connectionString) throw new Error("POSTGRES_URL is required");
const pool = new Pool({ connectionString, max: 1 });
const uid = () => randomBytes(9).toString("base64url");

try {
  await migrate(drizzle(pool), {
    migrationsFolder: resolve(root, "packages/db/migrations"),
  });
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      'SELECT count(*)::int AS count FROM "user"',
    );
    if (existing.rows[0].count !== 0) {
      throw new Error(
        "Owner bootstrap is allowed only on an empty installation",
      );
    }
    const userId = randomUUID();
    await client.query(
      'INSERT INTO "user" (id, name, email, "emailVerified") VALUES ($1, $2, $3, false)',
      [userId, "Adrenaline owner", email],
    );
    const workspace = await client.query(
      'INSERT INTO workspace ("publicId", name, description, slug, "createdBy", "cardPrefix") VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [
        uid(),
        "Adrenaline Entertainment",
        "Internal projects, events, and production tasks",
        "adrenaline",
        userId,
        "AE",
      ],
    );
    const workspaceId = workspace.rows[0].id;
    let adminRoleId;
    for (const [role, level] of [
      ["admin", 100],
      ["member", 50],
      ["guest", 10],
    ]) {
      const created = await client.query(
        'INSERT INTO workspace_roles ("publicId", "workspaceId", name, "hierarchyLevel", "isSystem") VALUES ($1, $2, $3, $4, true) RETURNING id',
        [uid(), workspaceId, role, level],
      );
      const roleId = created.rows[0].id;
      if (role === "admin") adminRoleId = roleId;
      for (const permission of getDefaultPermissions(role)) {
        await client.query(
          'INSERT INTO workspace_role_permissions ("workspaceRoleId", permission, granted) VALUES ($1, $2, true)',
          [roleId, permission],
        );
      }
    }
    await client.query(
      'INSERT INTO workspace_members ("publicId", email, "userId", "workspaceId", "createdBy", role, "roleId", status) VALUES ($1, $2, $3, $4, $3, $5, $6, $7)',
      [uid(), email, userId, workspaceId, "admin", adminRoleId, "active"],
    );
    const boards = [
      [
        "Projects",
        "projects",
        ["Backlog", "Ready", "In progress", "Review", "Done"],
      ],
      [
        "Events",
        "events",
        ["Planning", "Confirmed", "Preparation", "Live", "Wrap up"],
      ],
      [
        "Production",
        "production",
        [
          "Brief",
          "Pre-production",
          "Production",
          "Post-production",
          "Delivered",
        ],
      ],
    ];
    for (const [name, slug, columns] of boards) {
      const created = await client.query(
        'INSERT INTO board ("publicId", name, slug, "workspaceId", "createdBy", visibility) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [uid(), name, slug, workspaceId, userId, "private"],
      );
      for (const [index, column] of columns.entries()) {
        await client.query(
          'INSERT INTO list ("publicId", name, "index", "boardId", "createdBy") VALUES ($1, $2, $3, $4, $5)',
          [uid(), column, index, created.rows[0].id, userId],
        );
      }
    }
    const token = randomBytes(32).toString("base64url");
    await client.query(
      'INSERT INTO verification (identifier, value, "expiresAt", "createdAt", "updatedAt") VALUES ($1, $2, now() + interval \'24 hours\', now(), now())',
      [`reset-password:${token}`, userId],
    );
    await writeFile(
      resolve(root, ".owner-setup.local"),
      `https://task.adrenaent.com/setup?token=${token}\n`,
      { mode: 0o600, flag: "wx" },
    );
    await client.query("COMMIT");
    log.info(
      "Owner and private project, event, and production boards created; setup link saved locally",
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}

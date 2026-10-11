import assert from "node:assert/strict";
import test from "node:test";

import { canStartContainer, containerEnvironment } from "./src/environment.mjs";

test("container startup requires the exact opt-in string", () => {
  for (const value of [undefined, false, true, "false", "TRUE", "1"]) {
    assert.equal(canStartContainer({ ENABLE_CONTAINER_START: value }), false);
  }
  assert.equal(canStartContainer({ ENABLE_CONTAINER_START: "true" }), true);
});

test("a missing database cannot silently fall back to ephemeral PGLite", () => {
  assert.throws(
    () => containerEnvironment({ BETTER_AUTH_SECRET: "x".repeat(32) }),
    /PostgreSQL/,
  );
  assert.throws(
    () => containerEnvironment({ POSTGRES_URL: "postgresql://db/kan" }),
    /authentication secret/,
  );
});

test("only application settings and secrets reach the container", () => {
  const values = containerEnvironment({
    POSTGRES_URL: "postgresql://db/kan",
    BETTER_AUTH_SECRET: "x".repeat(32),
    NEXT_PUBLIC_BASE_URL: "https://kan.adrenaent.com",
    SMTP_PASSWORD: "test-password",
    CLOUDFLARE_API_TOKEN: "must-not-be-forwarded",
    ENABLE_CONTAINER_START: "true",
    KAN: { fetch() {} },
  });
  assert.equal(values.NODE_ENV, "production");
  assert.equal(values.SMTP_PASSWORD, "test-password");
  assert.equal(values.CLOUDFLARE_API_TOKEN, undefined);
  assert.equal(values.ENABLE_CONTAINER_START, undefined);
  assert.equal(values.KAN, undefined);
});

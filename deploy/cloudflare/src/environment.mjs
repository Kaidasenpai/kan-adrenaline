const prefixes = [
  "NEXT_PUBLIC_",
  "BETTER_AUTH_",
  "S3_",
  "SMTP_",
  "OIDC_",
  "GOOGLE_",
];
const names = new Set([
  "POSTGRES_URL",
  "REDIS_URL",
  "EMAIL_FROM",
  "KAN_ADMIN_API_KEY",
  "LOG_LEVEL",
]);

/** @param {Record<string, unknown>} bindings */
export function canStartContainer(bindings) {
  return bindings.ENABLE_CONTAINER_START === "true";
}

/** @param {Record<string, unknown>} bindings */
export function containerEnvironment(bindings) {
  if (
    typeof bindings.POSTGRES_URL !== "string" ||
    !/^postgres(?:ql)?:\/\//.test(bindings.POSTGRES_URL)
  ) {
    throw new Error("An external PostgreSQL database is required.");
  }
  if (
    typeof bindings.BETTER_AUTH_SECRET !== "string" ||
    bindings.BETTER_AUTH_SECRET.length < 32
  ) {
    throw new Error(
      "A 32-character or longer authentication secret is required.",
    );
  }
  /** @type {Record<string, string>} */
  const values = { NODE_ENV: "production" };
  for (const [key, value] of Object.entries(bindings)) {
    if (
      typeof value === "string" &&
      (names.has(key) || prefixes.some((prefix) => key.startsWith(prefix)))
    ) {
      values[key] = value;
    }
  }
  return values;
}

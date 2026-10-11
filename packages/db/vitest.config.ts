import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["src/worker-client.test.ts"] },
});

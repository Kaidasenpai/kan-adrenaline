import worker from "open-next-worker";

import { withWorkerDatabase } from "@kan/db/worker-client";

interface WorkerEnvironment {
  POSTGRES_URL: string;
  BETTER_AUTH_SECRET: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}
interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export default {
  async fetch(request: Request, env: WorkerEnvironment, ctx: WorkerContext) {
    const path = new URL(request.url).pathname;
    if (path === "/source") {
      return Response.redirect(
        "https://github.com/Kaidasenpai/kan-adrenaline",
        302,
      );
    }
    if (!env.POSTGRES_URL || !env.BETTER_AUTH_SECRET) {
      return new Response("Adrenaline Tasks is awaiting its secure setup.", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const response = await withWorkerDatabase(
      env.POSTGRES_URL,
      () => worker.fetch(request, env, ctx),
      (promise) => ctx.waitUntil(promise),
    );
    const headers = new Headers(response.headers);
    headers.set("Referrer-Policy", "no-referrer");
    if (path === "/setup") headers.set("Cache-Control", "no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

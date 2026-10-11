import { Container } from "@cloudflare/containers";

import { canStartContainer, containerEnvironment } from "./environment.mjs";

interface Env {
  KAN: DurableObjectNamespace<KanContainer>;
  ENABLE_CONTAINER_START: string;
  SOURCE_URL: string;
  POSTGRES_URL?: string;
  BETTER_AUTH_SECRET?: string;
  [key: string]: unknown;
}

export class KanContainer extends Container<Env> {
  defaultPort = 3000;
  sleepAfter = "30s";
  envVars = containerEnvironment(this.env);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/source") {
      return Response.redirect(env.SOURCE_URL, 302);
    }
    if (!canStartContainer(env)) {
      return new Response(
        "Adrenaline Kan is not deployed. Container startup is disabled to prevent container usage charges.",
        {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }
    // Validate before retrieving the Durable Object or launching its container.
    try {
      containerEnvironment(env);
    } catch {
      return new Response(
        "Adrenaline Kan deployment configuration is incomplete.",
        {
          status: 503,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
    const container = env.KAN.get(env.KAN.idFromName("adrenaline"));
    return container.fetch(request);
  },
} satisfies ExportedHandler<Env>;

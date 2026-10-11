import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

const config = defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  tagCache: "dummy",
  queue: "dummy",
  cachePurge: "dummy",
  routePreloadingBehavior: "none",
});

config.buildCommand = "pnpm --filter @kan/mcp build && next build";
config.cloudflare = { useWorkerdCondition: true };
export default config;

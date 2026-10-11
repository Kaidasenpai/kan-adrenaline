# Adrenaline Tasks on Workers Free

Address: https://task.adrenaent.com. Source: https://github.com/Kaidasenpai/kan-adrenaline.

This deployment uses Cloudflare Workers **Free** and Neon PostgreSQL **Free**. It does not use Containers, R2, Durable Objects, KV, paid image processing, or paid email. Cloudflare's existing account subscriptions are separate; this project must not change them. Keep both services on Free. Free quotas can stop requests or suspend database availability; never upgrade plans automatically to restore service.

Workers Free currently allows 100,000 dynamic requests/day, 10 ms CPU/request, and 128 MB memory. Static assets are served through the ASSETS binding. Neon Free imposes database storage and compute limits. Check the providers' current Free quotas before future changes: https://developers.cloudflare.com/workers/platform/limits/ and https://neon.com/pricing. Quota exhaustion means an interruption, not approval to spend money. This is suitable for a small internal team, with no paid availability guarantee.

## Setup

The application preserves Kan's board, task, activity, membership, and permission system. The initial private workspace has Projects, Events, and Production boards. Public registration is closed; an active, unexpired administrator-created workspace invitation link permits registration. Email delivery and attachments requiring external object storage are not configured. For onboarding, the administrator can share invitation links directly. Keep boards private unless sharing is intentional.

Use Node 22+ and pnpm 9.14.2. The deploy configuration is `apps/web/wrangler.jsonc`. Verify Cloudflare's billing dashboard says **Workers Free**, and the Neon project's owner is on **Free**, before deployment. Do not deploy this configuration from a Workers Paid account if zero additional charges is required.

Create an ignored `apps/web/.dev.vars` file with two secrets:

```dotenv
POSTGRES_URL="postgresql://USER:PASSWORD@POOLED_HOST/tasks?sslmode=verify-full"
BETTER_AUTH_SECRET="A_CRYPTOGRAPHICALLY_RANDOM_SECRET"
```

Keep this file private (permission 0600). Never commit passwords, connection strings, or setup tokens. Use a Neon pooled connection. Password hashing runs PostgreSQL pgcrypto bcrypt with SHA-256 prehashing, avoiding expensive hashing in the Worker and bcrypt's input truncation. Database connections are isolated per Worker request and closed after the request.

For a **fresh empty database only**, initialize once:

```sh
node deploy/cloudflare/bootstrap-workers.mjs OWNER_EMAIL
```

This runs Kan's existing migrations, enables pgcrypto, creates the owner and workspace, and writes an ignored `.owner-setup.local` file with a one-use password setup link valid for 24 hours. The owner chooses their password. The script refuses to initialize a database containing users. Protect this link like a password.

## Build and deploy

```sh
pnpm install --ignore-scripts
pnpm --filter @kan/web workers:build
pnpm --filter @kan/web workers:check
pnpm --filter @kan/web workers:preview
```

Check the existing DNS record for `task.adrenaent.com` before attaching it. After confirming the Free plans and testing the local Worker, deploy locally:

```sh
cd apps/web
pnpm exec wrangler deploy --secrets-file .dev.vars
```

No automatic cloud deployment is configured. The custom Worker wrapper provides request-scoped PostgreSQL access and a `/source` link. The application displays a visible source-code link to comply with AGPLv3; retain the license and publish the corresponding source for every deployed modification.

## Operational limits

The database is hosted by Neon, not Cloudflare. Free compute may sleep, causing a slower first request. A deployment succeeds only if the current Free bundle and CPU limits permit it. If the provider rejects a deployment or requests exceed quotas, reduce resource use or accept temporary unavailability; do not enable billable services. Protect the database with routine exports appropriate to its Free storage limits. This configuration cannot prevent charges from unrelated account resources or later manual plan changes.

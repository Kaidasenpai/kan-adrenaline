# Validation — 11 October 2026

Prepared against upstream commit `d0809f05422bcc3f1acb98804d44671207e7ed9d`.

## Passed

- Deployment package TypeScript check (`npm run typecheck`).
- Three tests covering explicit startup opt-in, required external database/auth secret, and exclusion of Cloudflare credentials from container environment (`npm test`).
- Wrangler Worker dry run with container rollout skipped (`npm run check`). No resources uploaded.
- Local Workers runtime using a temporary configuration without an image: `/` returns HTTP 503 with `Cache-Control: no-store` while startup is disabled; `/source` returns a redirect to the fork.
- Formatting check of the new deployment code/configuration and `git diff --check`.

## Not verified

- Docker image build: Docker CLI is installed, but its daemon is not running. `npm run check:image` stops before building. The Worker dry run skips this step explicitly.
- Production database, email, storage, first-admin setup, invited signup behavior, AGPL source link in the app, and live DNS. No hosting services or secrets were provisioned.
- Current Workers subscription: available account credentials cannot read the billing subscriptions endpoint (HTTP 403). The domain's Cloudflare zone is active, but this does not prove Workers Paid enrollment or available included allowances.

## Inherited repository failures

The application source has not been changed by this deployment preparation.

- `pnpm lint` fails in existing packages, including missing ESLint configuration in `apps/docs` and `packages/logger`, existing rule violations, and a Next.js font-rule crash in the web package.
- `pnpm typecheck` fails immediately in `apps/docs`, which has no TypeScript configuration.
- A follow-up check excluding docs (`pnpm exec turbo run typecheck --continue --filter='!@kan/docs'`) completes 20 tasks and fails the web check on existing bootstrap typings, board visibility typing, and SVG module declarations.

These failures are not treated as a successful application validation. No Cloudflare deployment was attempted, no DNS records were changed, and no paid plan was enabled.

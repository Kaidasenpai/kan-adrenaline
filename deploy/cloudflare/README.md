# Adrenaline Kan deployment preparation

Target: `https://kan.adrenaent.com`. Fork: https://github.com/Kaidasenpai/kan-adrenaline.

## Status and cost constraint

This is a prepared configuration, **not a live deployment**. `ENABLE_CONTAINER_START` is `false`; requests are rejected before retrieving a Durable Object or starting a container. No automatic deployment workflow or deploy package script is included.

Cloudflare Containers requires Workers Paid. The plan currently includes 25 GiB-hours of memory, 375 vCPU-minutes, and 200 GB-hours of disk per month, shared with account usage. Usage above allowances is billed, as are applicable Workers, Durable Objects, logs, and egress. One `basic` instance provisions 1 GiB RAM and 4 GB disk: the memory allowance alone covers about 25 active hours per month if no other containers use it. Sleeping after 30 seconds of inactivity and limiting instances to one reduces consumption but does not impose a monetary cap.

**Do not deploy or enable container startup under a strict zero-extra-cost requirement.** Turning off startup prevents this Worker from starting containers; it does not make deploying Workers/Containers free or protect against charges from other account resources.

Pricing: https://developers.cloudflare.com/containers/platform/pricing/.

An existing Docker server behind Cloudflare Tunnel is an alternative with no additional Cloudflare hosting charge, subject to its plan and service limits. It still needs an always-on host. No host has been selected.

## Check without deploying

From this directory:

```sh
npm ci
npm run typecheck
npm test
npm run check
```

The last command is Wrangler's **dry run** with container rollout skipped: it bundles the Worker and validates configuration without uploading resources or building the Docker image. To also build the image locally with Docker running, use `npm run check:image`. Neither command proves production logins, email, or storage work.

The existing `apps/web/Dockerfile` is built from the repository root. Its final `web` stage serves port 3000. Cloudflare requires Linux/AMD64 images. The Worker routes app requests to one named container and forwards only application settings, not Cloudflare credentials or object bindings.

## Before a live deployment

1. Resolve the hosting/cost choice. Workers Paid or another Cloudflare subscription does not mean unlimited included container usage.
2. Provide external PostgreSQL. Local PGLite data would be lost when a container is replaced, so startup rejects missing database configuration.
3. Run Kan's migrations against that database (`pnpm db:migrate` with `POSTGRES_URL` set securely) before enabling traffic. Containers does not run the repository's Docker Compose migration service.
4. Set `POSTGRES_URL` and a random, 32-character-or-longer `BETTER_AUTH_SECRET` as Worker secrets. Configure SMTP for invitations/password recovery. Keep credentials outside source control and Docker build arguments.
5. For uploads, configure private S3-compatible storage, access, and CORS. R2 can incur charges; no bucket is provisioned here. Harden the upstream attachment downloader, including rejection when storage is unconfigured and validation of redirects, before exposing uploads.
6. Keep signup disabled except during controlled first-admin provisioning. Confirm invited users can join with signup disabled. Restrict access while provisioning the first admin.
7. Set `SOURCE_URL` to the fork revision matching the deployed image. Preserve copyright/license notices and add a prominent in-app source link for AGPLv3 compliance. `/source` redirects to the configured source location but is not a substitute for the visible offer.
8. Check existing DNS records for `kan.adrenaent.com` before attaching the custom domain. No DNS records have been changed by this preparation.
9. Build the image and test migrations, login, invitations, permissions, calendars, restarts, and backup restoration in staging. Adjust `basic` if memory testing requires it; that affects cost.

After these requirements and the cost decision are resolved, Wrangler can deploy this configuration. Leave startup disabled until the database and secrets are ready. The account ID and domain identify the intended account; they are not credentials.

## Adrenaline workspace setup

Create an **Adrenaline Entertainment** workspace and reusable boards for:

- **Events:** Planning → Ready → In progress → Review → Complete. Checklist: venue, permits, suppliers, crew, artwork, rehearsal, event-day checks, closeout.
- **Production:** Brief → Pre-production → Shoot → Post-production → Review → Delivered. Checklist: brief, script, shot list, equipment, crew, shoot, edit, sound, final delivery.
- **Marketing:** Ideas → Scheduled → Creating → Approval → Published. Checklist: copy, artwork, channel, approval, publishing, results.

Use department labels (Production, Creative, Marketing, Operations), one board per project/event, and assigned members with due dates. These are setup instructions; no live workspace or user accounts have been created.

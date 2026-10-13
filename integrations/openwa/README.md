# Adrenaline WhatsApp test bridge

This local integration connects one explicitly configured OpenWA session and test group to one private Adrenaline Tasks board. It requires Node.js 24 and uses only Node's HTTP, crypto, SQLite and fetch libraries. There is no n8n, AI API, SaaS connector, paid Cloudflare feature, or new cloud deployment.

The webapp stays at `https://task.adrenaent.com`. OpenWA delivers signed events to the local bridge, which calls the existing Tasks API on demand and replies through OpenWA. No public tunnel is required when both services run on the Mac or on a private Docker network. There is no background polling of the cloud database. Existing hosting free-tier quotas still apply; this does not upgrade any plan or enable billing. Electricity, internet and the WhatsApp number remain outside the software setup.

## Runtime configuration

Copy `config.example.json` to a runtime directory **outside this Git repository**, fill in the actual identifiers, and set its mode to `0600`. Keep the runtime directory at mode `0700`. Set `databasePath` to an absolute path in that protected directory. Do not place API keys, account session files or queue databases in the repository.

- `webhookSecret`: random secret of at least 32 characters, identical to the OpenWA webhook signing secret.
- `sessionId`: exact OpenWA session ID. Configure its webhook for `message.received`, pointing to `http://127.0.0.1:18878/webhook` when both services run on the host, or the bridge's service hostname on a private container network. When OpenWA runs in Docker, its `127.0.0.1` points to the container itself; use the bridge service name or a reachable host address instead. Keep OpenWA's SSRF protection enabled and add only that exact hostname to its `SSRF_ALLOWED_HOSTS` setting so local webhook registration and delivery are permitted.
- `allowedGroupIds`: explicit test group JIDs ending in `@g.us`. An empty list disables intake.
- `allowedSenderIds`: explicit participant JIDs from OpenWA's verified `data.author` field. Phone JIDs and `@lid` identifiers are not interchangeable; use the actual participant identifier. An empty list disables intake.
- `allowFromMe`: defaults to false. To test from the linked account itself, set this to true, set `selfSenderId` to that owner's identifier, include it in `allowedSenderIds`, and subscribe the webhook to `message.sent` as well as `message.received`. OpenWA uses `message.sent` for messages composed on the linked phone. Sent events require `fromMe: true`, and API replies are excluded by their fixed `[Adrenaline Test]` prefix. Duplicate appearances of the same message across both event names remain one queue job.
- `tasks`: a new named user API key from **Settings → API**, and the actual workspace, test board, inbox list, done list and responsible owner's **workspace member public ID**. All five IDs are required. The owner must be an active workspace member. Keys inherit the issuing user's permissions; this bridge enforces its narrower test-board scope.
- `openwa`: local/private API base URL and an OpenWA API key scoped to the session and test chat. Use the least-privileged sending role supported by the installation, not its bootstrap administrator key.
- `maxAttempts`: 1–8, default 5. Retries use bounded exponential delays from 30 seconds to 5 minutes.

An incomplete configuration can expose a non-sensitive health check but rejects webhook intake. Invalid paths, file permissions or URL origins stop startup. Do not expose the bridge or OpenWA administrator interface publicly. In Docker, use `HOST=0.0.0.0` only on the private network; do not publish the bridge port to the LAN or internet. Bind a published health port to `127.0.0.1` if local inspection is needed.

Start from the repository directory:

```sh
ADRENALINE_OPENWA_CONFIG='/absolute/protected/path/bridge-config.json' node integrations/openwa/bridge.ts
```

The same path may be mounted into a container. Node 24 executes these TypeScript files directly, with no build or dependency installation. `GET /health` returns only `{ "status": "ok", "configured": true|false }`; it does not indicate whether WhatsApp is currently linked or whether the last message succeeded. Console output never includes credentials, chat identifiers, message bodies or response bodies.

## Mac operations with Colima

`compose.example.yaml` runs OpenWA 0.24.0 and Node 24.13.1 on an Apple silicon Mac. Copy it to the protected runtime directory as `compose.yaml`, alongside `bridge-config.json`, a `bridge-data` directory, and a copy of this integration at `code/integrations/openwa`. Keep the runtime directory and `bridge-data` at mode `0700`, and the configuration at mode `0600`. Source files are mounted read-only; session data and the queue persist separately from the containers.

For this container layout, set these configuration values:

```json
{
  "host": "0.0.0.0",
  "port": 18878,
  "databasePath": "/runtime/data/queue.sqlite",
  "openwa": {
    "baseUrl": "http://openwa:2785",
    "apiKey": ""
  }
}
```

These are overrides for the complete configuration, not a replacement for it. Add the session/chat-scoped OpenWA key privately. Register the session webhook at `http://bridge:18878/webhook` with the same private signing secret. The example permits only the exact `bridge` hostname through OpenWA's SSRF protection. Host access is limited to `127.0.0.1:2785` for OpenWA and `127.0.0.1:18878` for the bridge health check; no tunnel or public webhook endpoint is needed.

Create the custom Colima profile once, using the actual protected runtime path:

```sh
ADRENALINE_OPENWA_RUNTIME='/absolute/protected/openwa'
/opt/homebrew/bin/colima start adrenaline-openwa \
  --cpus 4 --memory 4 --disk 20 \
  --vm-type vz --mount-type virtiofs \
  --mount "${ADRENALINE_OPENWA_RUNTIME}:w" \
  --activate=false --ssh-config=false
DOCKER_CONTEXT=colima-adrenaline-openwa /opt/homebrew/bin/docker-compose \
  -f "${ADRENALINE_OPENWA_RUNTIME}/compose.yaml" up -d
```

Use the dedicated profile and explicit Docker context for every operation. This preserves the user's Docker Desktop context and keeps these services separate from other Docker work. Subsequent starts reuse the saved CPU, memory, disk and mount configuration:

```sh
/opt/homebrew/bin/colima start adrenaline-openwa \
  --activate=false --ssh-config=false --save-config=false
DOCKER_CONTEXT=colima-adrenaline-openwa /opt/homebrew/bin/docker-compose \
  -f "${ADRENALINE_OPENWA_RUNTIME}/compose.yaml" up -d
```

For automatic startup, use a user LaunchAgent that invokes a private startup script containing those two commands. Use absolute executable paths and a PATH containing `/opt/homebrew/bin` and the system binary directories. Set `RunAtLoad` to true, retry failed exits with a throttle, and let the script exit after a successful start. If this Mac is the always-on server, the script can instead end with `exec /usr/bin/caffeinate -i`; unloading that LaunchAgent releases the idle-sleep assertion. Do not use the generic Homebrew Colima service, which starts the default profile. A user LaunchAgent starts after the user logs in; it does not provide unattended startup before login or FileVault unlock. `restart: unless-stopped` restarts the containers when their Docker engine returns, but does not start the Mac or Colima itself.

Keep a 75-second `stop_grace_period` for both services. A bridge command may perform a board read, a task mutation and a WhatsApp reply, with a 20-second timeout for each request. This gives an in-progress command time to finish during a planned restart. If it is interrupted anyway, the persisted recovery rules below still apply.

The Mac must remain awake and online. A temporary `caffeinate -i` assertion can prevent idle sleep while the server is needed without changing global power settings; shutdown, manual sleep and laptop lid closure still interrupt service. The cloud task app continues to work while the Mac is unavailable, but WhatsApp commands cannot be guaranteed to process during that interruption.

Check the local health endpoint and OpenWA's session status separately. A healthy bridge container and `configured: true` do not prove that WhatsApp is paired or that either API key is still valid. Rotate expiring or revoked keys in the protected configuration, then restart only the bridge. Never include keys in command output, screenshots, Git commits or shared logs.

To stop the integration, unload its login LaunchAgent first, then stop the containers and the dedicated profile:

```sh
DOCKER_CONTEXT=colima-adrenaline-openwa /opt/homebrew/bin/docker-compose \
  -f "${ADRENALINE_OPENWA_RUNTIME}/compose.yaml" stop
/opt/homebrew/bin/colima stop adrenaline-openwa
```

For backups, stop both containers so their SQLite files and session files are consistent. Back up the protected configuration and `bridge-data`, plus the Compose-managed `openwa-data` named volume. That volume lives inside Colima; copying the host runtime directory alone does **not** preserve the WhatsApp session. Export its contents with the explicit Docker context or use a supported OpenWA backup procedure. Keep backups private and restore both queue history and session data. Do not use `down --volumes`, delete the Colima profile, or discard the queue as a restart procedure: those actions remove persistent data or duplicate protection.

## Test-group commands

```text
!task Prepare stage layout | 2026-10-20
مهمة تجهيز مخطط المسرح | 2026-10-20
!tasks
مهام
!done TASK_PUBLIC_ID
تم TASK_PUBLIC_ID
!help
مساعدة
```

Dates are optional and use `YYYY-MM-DD`; they are stored at 00:00 UTC on that day. Each new task is assigned to the configured owner and placed in the configured inbox. Descriptions record the WhatsApp sender, receipt time and a hashed source-message reference. `!tasks` returns up to eight open tasks from the test board. `!done` accepts the public ID in the task URL and only moves a card already present on that board. English commands require `!`; Arabic commands accept it optionally. Ordinary chat, media, other groups, other sessions, other participants, and outgoing API echoes are ignored.

## Delivery and recovery

The bridge verifies `X-OpenWA-Signature: sha256=<hex>` against the exact raw request body and refuses bodies over 64 KiB. Accepted commands are persisted before acknowledging the webhook. A SQLite unique key derived from session ID and message ID prevents webhook retries and duplicate appearances across received/sent events from repeating actions. Only one local worker processes the queue. Run exactly one bridge process per queue database. Queued commands are bound to their original board/list/owner configuration and are rejected if that configuration or their sender's authorization changes before execution.

Safe read/rate-limit failures receive bounded retries. If creating a task has an ambiguous outcome (connection lost, server error, or process restart), the bridge looks for its source marker in the test board before doing anything else. It **never automatically repeats an uncertain create**. If reconciliation cannot find the card, the job stops after the configured attempt limit and requires local review. A confirmed 429 can be retried because the request was rejected.

A completed task mutation and its reply text are persisted before sending. An uncertain WhatsApp send stops instead of risking repeated messages. A restart during sending is also marked `reply_delivery_uncertain`. Inspect failed queue rows locally as the operator; message content and the database are sensitive. There is no automatic retry of failed rows. Confirm whether the task or reply exists before asking the test user to send a new command. Do not delete queue history merely to retry a message; that removes duplicate protection.

The local queue stores accepted command text. Back up and protect the runtime directory alongside the OpenWA session directory. The Mac must be awake and connected for this bridge to process events; the cloud task app remains independently available.

## Verification

```sh
node --test integrations/openwa/bridge.test.ts
```

Tests use temporary local SQLite databases and mocked API calls. They cover signature validation, session/group/sender restrictions, explicit self-account handling, duplicate delivery, create reconciliation after restart, bounded retries, cross-board update rejection and uncertain reply handling. Tests send no real messages and create no live tasks.

Before allowing team use, complete a real smoke test only in the allowlisted test group: create one task, open its private link, request the task list, mark the task done, and redeliver the same webhook once to confirm no duplicate task/reply. This integration does not change WhatsApp's unofficial-client account restrictions.

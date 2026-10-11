# Validation — 11 October 2026

Adapted from upstream commit `d0809f05422bcc3f1acb98804d44671207e7ed9d`.

## Deployment and cost controls

- Live HTTPS application: https://task.adrenaent.com, Worker `adrenaline-tasks`.
- Signed-in Cloudflare billing dashboard confirmed **Workers Free — Active**, including after deployment. The account already has an unrelated R2 Paid subscription; this application has no R2 binding and did not change that subscription.
- Neon project's owner subscription confirmed **Free**. Project `wild-dream-21369401`, AWS Frankfurt, PostgreSQL 17, pooled connection, 0.25 CU compute.
- Actual deployed Worker settings confirmed bindings consist only of static ASSETS, plain configuration variables, and POSTGRES_URL/BETTER_AUTH_SECRET as encrypted secret_text. No Containers, R2, KV, Durable Objects, Hyperdrive, paid email, or automatic upgrades are configured.
- Existing DNS inventory had no task.adrenaent.com record. Wrangler attached only the requested custom domain.
- OpenNext build and Wrangler upload succeeded on Free. Uploaded bundle approximately 19 MiB uncompressed / 3.8 MiB gzip. Worker startup approximately 34 ms. Free runtime quotas remain applicable; these checks do not guarantee uptime under every workload.

## Passed

- 145 API tests across 17 files, covering repositories, authorization, permissions, card indexes, and activity history.
- 4 request-database tests: access requires a request, concurrent requests are isolated, a request reuses its pool, and cleanup occurs on errors without opening a pool for static pages.
- 20 authentication tests, including password prehashing, format rejection, closed registration, and valid invitation handling.
- 21 application build/typecheck tasks pass when excluding the documentation package.
- Lint checks for newly added Worker, setup page, request-database code, password/invitation helpers and tests pass. Required root lint and typecheck commands were run; inherited issues are listed below.
- Actual PostgreSQL hashing distinguishes passwords beyond bcrypt's 72-byte limit and validates the correct password.
- Local Workerd and live HTTPS checks: signed temporary owner session, workspace membership, and all three private boards accessible; anonymous workspace access denied. Temporary sessions removed after verification.
- Live uninvited signup rejected with FAILED_TO_CREATE_USER; public registration remains closed.
- Invitation validation against PostgreSQL: active links allowed; expired, revoked, and deleted-workspace links rejected. Test database changes rolled back.
- Live /login and /setup return 200; /source redirects to the public fork. Setup uses Cache-Control: no-store and Referrer-Policy: no-referrer.
- Desktop and 375 px mobile sign-in/setup layouts inspected in the browser. Visible AGPL source offer retained.
- Owner provisioned through a private, one-use, 24-hour password setup link. The user chose their own password, signed in successfully, and the browser showed the Adrenaline workspace, all three boards, and the Projects board with its five columns.
- Git diff whitespace check passed; secrets and setup token files ignored and permission 0600.

## Inherited repository issues

- Root pnpm lint fails on existing rule violations, missing ESLint flat configuration in apps/docs and packages/logger, generated email-preview files, and an old Next font-rule incompatibility with ESLint 9. The problematic font rule was disabled only for scoped validation commands, not globally.
- Root pnpm typecheck stops at apps/docs, which lacks a TypeScript configuration. Excluding docs passes all 21 tasks.

## Limits and remaining manual setup

Owner account setup is complete. Invited users' complete browser signup has not been simulated with real credentials; invitation authorization has unit and PostgreSQL transaction coverage. Email sending and external object storage remain unconfigured; use the existing shared workspace invitation link to onboard teammates. Password recovery requires a new administrator-issued private setup/reset link while email is disabled.

This deployment's Free quotas can interrupt service. No paid plan was enabled. This configuration cannot cap charges from unrelated resources or future manual plan changes.

## Workspace redesign — 11 October 2026

- Replaced the rejected square/check branding with an exact extension of the original offset-square symbol and custom stacked wordmark, plus a Tasks descriptor. No proprietary fonts extracted.
- Rebuilt the workspace navigation, sign-in/setup shell, boards overview, working boards/cards/forms, task detail, members, settings layout, and shared controls with a consistent warm neutral/lime system and Plus Jakarta Sans. Light and dark themes share the same hierarchy.
- Board tiles display actual visibility and workflow stages. The list query includes visibility and excludes soft-deleted lists/labels; no database migration or fabricated dashboard data.
- 145 API tests pass. Application type checks pass all 21 tasks excluding the inherited documentation-package failure. Required root lint/typecheck were rerun and remain limited by the inherited issues documented above. Scoped redesigned shared/navigation/auth controls pass ESLint with only the inherited Next font rule disabled for that command.
- All 41 new interface messages and 15 existing Adrenaline auth/setup/source messages have translations in all 10 configured compiled catalogs. Existing nonempty translations and metadata preserved.
- Independent code review found and resolved menu keyboard highlights, portalled mobile-menu outside clicks, short-screen sidebar reachability, weak secondary text/focus contrast, and focusable offscreen mobile panels. Reduced-motion preferences preserved.
- No hosting, database plan, paid bindings, or external asset services added.
- OpenNext production build succeeds. Local Workerd sign-in rendered and inspected at 1440 × 900 and 375 px CSS widths; light/dark variants are readable and document scrollWidth equals clientWidth. Password inputs/reveal/submit, theme control, closed-registration notice, original-wordmark masks, and visible source offer verified.
- Live signed-in browser verification: owner session retained; all three actual private boards and five-stage workflows load. Projects board controls, empty columns, and labeled new-card modal inspected without creating sample data. Members and settings navigation rendered at 375 px; document has no horizontal overflow and mobile navigation closes after choosing a page. Desktop overview independently reviewed against the generated reference with no material issue found.
- Balanced the sign-in hero line wrapping after visual review, rebuilt, and inspected the refined desktop rendering.
- Populated task-detail and long-column drag paths were not exercised against live fabricated tasks; TypeScript and API/permissions/index tests cover the preserved behavior, with the available-height scroll fix code-reviewed.
- Final production version: `cd7e7727-b23c-41f8-96b4-6c1e0ebe2dfa`, application source commit `6f6d0a11`. Final 375 px workflow labels checked after spacing refinement; document overflow remains zero. At 640 × 320 the sidebar scrolls while account controls remain within the viewport; keyboard-active menu styling and portalled theme selection were verified. Desktop sidebar collapse/expand verified and restored; temporary viewport override reset. Live desktop/mobile screenshots saved outside the public repository.

## Arabic integration — 11 October 2026

- Added a complete Arabic catalog: 1,179 source messages (1,143 active), with no empty translations. Two translation passes and an independent contextual review use consistent task, board, workflow-column, workspace, and role terminology. Arabic count messages support all six plural categories; interpolation names and rich-text markup are checked against English.
- Language selection is available before sign-in and in account settings. Browser-language detection, saved preference, asynchronous catalog loading, document language/direction, and switching back to English are integrated. Noto Sans Arabic is bundled with the application; no external font or translation service is required at runtime.
- Mirrored navigation, forms, menus, task details, calendar controls, and board workflows. Arabic dates use the Gregorian calendar and Arabic digits. Emails, URLs, technical identifiers, and user-entered content retain their own text direction; stored board, column, and task names are not rewritten.
- Added Arabic validation/error copy and localized editor commands, webhook labels, accessibility instructions, drag announcements, and confirmation dialogs. RTL column sorting and positive-coordinate horizontal scrolling preserve the existing drag behavior and per-direction scroll restoration.
- All 50 web tests pass, including catalog completeness/ICU integrity, Arabic plurals/dates, regional language matching, and RTL sorting geometry. All 21 application typecheck tasks pass when excluding the inherited documentation-package failure. New localization/shared-control scope passes ESLint. Required root lint/typecheck commands were run and still encounter the inherited issues listed above.
- Production OpenNext build succeeds. Local sign-in was inspected at desktop and 375 px widths; Arabic font/direction, language switching, saved preference after reload, translated source offer, and zero document horizontal overflow were verified.
- No database migration, hosting-plan change, paid binding, or paid service was added.

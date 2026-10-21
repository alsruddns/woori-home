# Production deployment preparation

Status: **BLOCKED for a PostgreSQL-backed production rollout.** No production server, database, container, or workflow run was accessed; no production workflow was changed. The observations below come from the `develop` repository at `95c42caf079dc015715523379c3daebd32e18a4e`, local development PostgreSQL, and the operator-provided server notes. Recheck all server-side facts during the release window.

## Verified development baseline

- Branch and commit: `develop`, `95c42caf079dc015715523379c3daebd32e18a4e`.
- Local DB: `woori_today_portal_dev`; 4 migrations applied, 0 pending. A second `pnpm db:migrate` run completed without adding a migration; status remained 4/0.
- Physical catalog: 8 public tables and 20 indexes, including the two financial tables. Existing applied migration SQL was not edited.
- World Bank approved scope: 16 country/aggregate records, 2 indicators, and 1,090 observations. JSON and DB keys and decimal values match exactly; 0 missing rows, unexpected rows, or mismatches. `SL.UEM.TOTL.ZS` has 560 rows through 2025; `EG.ELC.ACCS.ZS` has 530 rows through 2024.
- Financial data: 0 financial assets and 0 daily prices. Unapproved market data remains unavailable to repositories and public pages.
- The 15-locale production build completed. HTTP checks returned 200 for home, `/about`, `/world`, `/stocks`, `/crypto`, `/gold`, `/commodities`, `/stocks/issues`, and `/crypto/issues` in all 15 locales, plus `robots.txt` and `sitemap.xml` (137 responses total). Gold, commodities, stocks, crypto, and both issue pages returned `noindex`; `/about` retained a canonical and localized homes exposed `x-default` hreflang. A browser automation executable was not available, so viewport rendering, interaction, hydration warnings, and browser console output were not checked.
- Final code validation: 75 tests passed; lint, TypeScript, production build, and `drizzle-kit check` passed.

## Release blockers to resolve before main or server changes

1. **Image and environment selection are not aligned with the supplied operations notes.** The checked-in `.github/workflows/publish.yml` builds `latest` and a commit-SHA image tag, then runs `docker compose --env-file .env.moneybook pull portal` and `up -d portal`. The supplied portal environment file is `/opt/services/compose/.env.portal`. The workflow does not update a server image tag to the just-built SHA or digest. Until the server Compose configuration and both environment files are inspected by the operator, it is not established that the workflow selects the intended portal image, runtime variables, or database network. Do not run the workflow as a release until it is changed and reviewed to use the portal-specific configuration and immutable image reference.
2. **Manual deployment is not branch-restricted in the workflow.** `workflow_dispatch` has no guard requiring `main`; a manual run may use the selected workflow ref. Add and review a main-only ref guard before permitting manual runs, so selecting `develop` cannot publish or deploy it.
3. **The application is not currently allowed to read PostgreSQL in production.** `WORLD_BANK_DATA_SOURCE` defaults to `json`, which is fail-safe. Selecting `db` is explicitly rejected unless `DB_TARGET=development`; no production DB mode has been implemented or validated. Leave production on JSON until a separate production-read change is reviewed and tested.
4. **The existing World Bank importer is development-only.** `pnpm data:worldbank:import` hard-codes the local development safety target. Do not point it at the production database or weaken that guard. A separately reviewed, explicitly gated production import procedure/tool is required before the planned 1,090-row load.
5. **Production state is unverified.** The server, Compose file, image digest, environment files, database contents, database roles, scheduled backup result, disk capacity, Nginx routing, and restore procedure were not inspected. The operator notes say the available restore test covered an empty DB; this does not prove recovery of the planned data set.

The current workflow is not changed by this preparation. Resolve the first blocker in an explicitly reviewed release-workflow change, then validate that it targets only the `portal` service, uses the portal environment file and a SHA or digest, avoids unrelated service recreation, and can select the previous immutable image. `docker compose up -d portal` does not itself prove that dependencies will be left alone; the release design should use a reviewed portal-only/no-dependency invocation where appropriate.

## Environment and application behavior

- Runtime application connection: `DATABASE_URL`, supplied to the portal process through its protected runtime configuration. Use the restricted `woori_portal` application role, not the migration role.
- One-off schema connection: `DB_MIGRATION_URL`, supplied only to the controlled migration process. Use a separate DDL-capable portal migration role. Never put either value in Git, an image build argument, or this document.
- On a pre-provisioned database, the migration role needs database `CONNECT`, schema creation for the `drizzle` migration journal, and permission to create/alter portal tables, constraints, and indexes in the selected schema. The runtime application role should be limited to `CONNECT`, schema `USAGE`, and the minimum table `SELECT` grants needed by the selected read path. Import/write grants belong to a separately reviewed one-off import role; do not grant DDL to the runtime role.
- The guarded migration runner requires `DB_TARGET=production`, the exact database name `woori_today_portal`, and `DB_MIGRATION_ALLOW_PRODUCTION=I_HAVE_APPROVAL`. It uses the migration URL and refuses destructive SQL unless a separately reviewed override is provided. Do not put the approval token in the application container.
- `WORLD_BANK_DATA_SOURCE` is an explicit server-side switch. Its default is `json`; there is no automatic switch when a database becomes available. In the current code, `db` remains development-only and must not be enabled in production.
- `pnpm data:worldbank:import` is restricted to local `woori_today_portal_dev`. Do not use a production URL with it. No data import runs during `next build` or app startup.
- The lazy server pool is capped at 2 connections. The Dockerfile builds a Next.js standalone image, runs as the unprivileged `nextjs` user, and listens on port 3003. Runtime secrets must be injected by the deployment platform, not copied into the image.
- `.dockerignore` excludes local environment files, `.git`, `.next`, and `node_modules` from Docker build context.

## Migration and initial data plan (not executed in production)

The applied sequence is `0000_init_data_catalog`, `0001_worldbank_collection_counts`, `0002_worldbank_country_metadata`, and `0003_financial_market_data`. The current local schema has 8 tables and 20 indexes. Existing migrations are append-only; do not edit them.

Before using any production migration command:

1. Freeze the reviewed source commit and immutable image SHA/digest. Confirm the portal Compose service, `.env.portal` runtime injection, database network, and target database name on the server.
2. Confirm a recent successful portal backup, its file size/checksum, available disk space, and that the backup can be restored to an isolated database. Do not treat the previously tested empty-database restore as proof of recovery for production data.
3. Read the production database migration history and inspect existing tables/rows before deciding whether this is an empty or populated database. Never initialize, truncate, or drop an existing database to make it match this release. If pre-existing tables conflict with the Drizzle history, stop and reconcile them with a DBA.
4. Review the four migration SQL files and checksums from the release commit. Provide `DB_TARGET=production`, `DB_MIGRATION_URL`, and the production approval gate only to a one-off protected migration runner. Run `pnpm db:status`, then `pnpm db:migrate`, then `pnpm db:status` using the same controlled release context. A migration failure stops the release; do not start the new application image.
5. Verify the applied journal and expected schema before importing. If the database is not empty, retain all existing data and reconcile each key rather than reinitializing.
6. **Stop here until the production importer blocker is resolved.** Build and review a production-scoped import mechanism that reads the exact reviewed release artifact, retains source attribution, uses a transaction/bounded batches, and has an explicit production approval gate. The current local importer must remain development-only. For the approved scope, expect 560 unemployment and 530 electricity-access observations (1,090 total); exclude all other JSON indicators until separately reviewed.
7. Verify counts, exact country/indicator/year keys, and numeric values against the artifact; confirm duplicate rerun counts are skipped and migration history stays unchanged. Do not change `WORLD_BANK_DATA_SOURCE=db` as part of that import; current application guards disallow production DB reads.

Do not put migration or import commands in Next.js build, the image `CMD`, or app startup. Use a separate, audited one-off operation. A fresh DB and an existing DB require different preflight decisions; neither case permits deleting existing data.

## Image deployment, health, and post-deploy checks

After the blockers above are resolved and the release is separately authorized:

1. Record both the currently running portal image ID/digest and the release image digest. Keep the prior image retrievable by immutable reference; `latest` alone is not a rollback record.
2. Pull the exact reviewed SHA/digest, then recreate only `portal` using the reviewed portal Compose file and environment. Keep MoneyBook, Calculator, Tools, Docs, Quiz, PostgreSQL, and Nginx out of the operation. Do not use the current workflow until its environment-file/tag mismatch is fixed and reviewed.
3. Wait for the existing portal healthcheck. Check container status and logs without printing environment values. Confirm the portal responds through its local health endpoint and public HTTPS routes through Nginx; inspect redirect behavior and TLS at the public origin.
4. Check locale home and `/about` routes, canonical/hreflang, `robots.txt`, `sitemap.xml`, and noindex on financial pages without approved price data. Confirm the existing URL set and family-site links remain intact.
5. If DB use is still JSON mode, verify the portal remains functional with DB access unavailable. If a later release separately enables production DB reads, compare the approved World Bank response to the artifact and monitor DB errors, pool connections, and response latency before broad traffic.

## Rollback and recovery

- For an application-only failure, stop rollout and restore the previously recorded immutable portal image reference, then recreate only the portal service. Confirm health and public routes. Do not depend on `latest` moving backward.
- Do not run reverse or automatic down-migrations. The schema may be used by newer application code and is not automatically coupled to image rollback. These migrations are additive; retain their tables and data while the old image runs.
- For a migration failure, stop before app rollout, preserve logs and the pre-migration backup, and investigate. Never delete migration history or tables to force a rerun. Restore a backup only under a separately reviewed recovery plan, after determining whether writes occurred since backup.
- For a data import failure, stop the release and preserve the run/error record. A production-safe retry mechanism is not yet implemented. Do not use the local import command against production.
- Verify the backup job succeeded after release and monitor disk usage. After non-empty production data is introduced, perform and record an isolated restore test before claiming the data is recoverable.

## Release decision

**BLOCKED** for a PostgreSQL-backed production rollout until the workflow environment/image selection and manual branch guard are corrected and reviewed, a production-safe World Bank importer exists, and production DB-read behavior is explicitly implemented and tested. The code can be built and the local database/data integrity is verified, but no production host or DB was inspected, and these checks do not authorize main merge or deployment.

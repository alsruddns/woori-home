# Production deployment preparation

Status rechecked 2026-10-22: GitHub `production` Environment exists and permits only `main` (no reviewer rule). The latest recorded main deployment is successful. Public checks reach the Portal API: the approved unemployment comparison returned `source=db` with `Cache-Control: no-store`; population returned `source=json` with its public cache policy; POST returned 405; `/ko` returned 200. The live `/portal-api/` route currently works. Runtime database privileges and host-side Nginx file contents have not been independently audited. No direct production DB command, migration, import, or write was run during this verification.

## Scope and verified baseline

- All release operations are scoped to the `portal` Compose service. The workflow does not invoke `docker compose down`, recreate dependencies, edit either server environment file, or change MoneyBook, Calculator, Tools, Docs, Quiz, PostgreSQL, or Nginx.
- The development PostgreSQL database is `woori_today_portal_dev`; latest local verification on 2026-10-25 found 12 migrations, 71,796 reviewed World Bank observations, 100 curated SEC companies, and zero financial price observations. The current SEC fact count is reported by the local DB status command; none of these development counts verify production state. No production data was accessed during local import or verification.
- Server paths and deployment behavior remain subject to on-host review. Public HTTP checks confirm current Portal behavior, not the exact contents of `/opt/services/compose/docker-compose.yml`, `.env.portal`, DB grants, or the active Nginx file.
- No production migration, import, direct DB command, or DB write was executed.

## Workflow controls

`.github/workflows/publish.yml` now:

1. Runs a release guard requiring `refs/heads/main` and event `push` or `workflow_dispatch`. A manually selected `develop` or `release/*` ref fails before image creation.
2. Preserves automatic Portal deployment on ordinary `main` pushes. A main integration commit whose message contains `[db-first]` skips both image creation and the SSH deploy job, while keeping `workflow_dispatch` available on `main`. Use this marker only for the SEC-first integration that must install the protected DB workflow without starting a new Portal image. Then run Migration and SEC Import separately and select `deploy_portal` only after both succeed. The normal push path remains unchanged.
3. Builds portal and one-off DB tools images, tags them with the full commit SHA plus the unique Actions run/attempt, and passes their registry `sha256` digests between jobs. Deployment references the portal digest, not `latest` or a mutable tag; every retry gets a distinct tag.
4. Uses the GitHub Actions `production` environment on the deploy job. The live environment was read-only checked on 2026-10-22: its branch policy allows only `main`, but it has no required reviewer rule. Add at least one required reviewer before running a production operation. The workflow also requires the protected `confirm_production_db_write` checkbox for each DB write run, in addition to the protected approval secret. Credentials are never written into the repository or printed by the workflow.
5. On the server reads both `.env.moneybook` and `.env.portal` for Compose interpolation without writing or replacing either file. For DB tools, it mounts `.env.portal` read-only and parses it with dotenv, which removes matching single or double quotes as Compose does. It forwards only `DATABASE_URL`, `DB_IMPORT_URL`, and `DB_MIGRATION_URL` to the selected short-lived DB command process. It does not use Docker `--env-file`, whose parsing differs for quoted values. Approval is mounted as a separate mode-0600 read-only file and is not placed in Docker arguments or container configuration. It validates Compose, confirms `portal` has exactly `default` and `database` networks, and requires the configured Portal image before it does anything to the running service.
6. Before DB writes, requires a separately recorded isolated-restore validation reference, checks free disk against the production DB size, runs the supplied backup script, limits the backup file to owner access, validates its PostgreSQL archive with `pg_restore --list`, and creates/checks a SHA-256 file. Portal-only deploys also create a new checksum-verified backup. The workflow cannot independently perform the isolated restore; that remains an external release gate.
7. Before any Portal replacement, verifies that the currently running Portal remains healthy and responds at `PORTAL_HEALTH_URL`. Creates a rollback tag from the running image ID, pulls the explicit image digest and runs `up -d --no-deps portal`; failures after rollout begins trigger an attempt to restore that tag and wait for container health.
8. Waits for the Portal healthcheck and requests `PORTAL_HEALTH_URL`. A failed check fails the job and triggers image rollback. Backup, DB status, and validation output must not include environment values.

The release will stop safely if the live Compose format/network differs from the assumed service layout. The Compose override removes import, migration, and production-approval variables from the Portal runtime; its runtime database role remains `DATABASE_URL`. An operator must inspect the live file and confirm the two env files and networks before enabling this workflow. The running Portal's Docker image ID must be inspectable, a healthcheck must exist, `jq` and `curl` must be installed, and the backup script must produce a new file under `/opt/backups/woori-portal`.

### Required GitHub configuration

- **Blocking:** add at least one required reviewer to the existing `production` environment. Read-only GitHub API checks on 2026-10-22 confirmed a custom branch policy containing only `main`, but no reviewer rule. Do not run production operations until reviewer protection is configured.
- Set `PORTAL_HEALTH_URL` to an HTTP(S) endpoint that returns a successful status through the intended route. Do not use a URL containing credentials.
- Set `PRODUCTION_DB_ALLOWED_HOSTS` to the exact production PostgreSQL hostname(s) used by the isolated DB network. It is an allowlist, not a URL.
- Add the non-empty `PRODUCTION_OPERATION_APPROVAL` secret only to the protected environment. Manual dispatch selects one operation: `preflight_database`, `apply_migrations`, `import_world_bank`, `import_sec`, or `deploy_portal`. Portal deploy defaults to false for manual runs. DB writes also require explicitly checking `confirm_production_db_write`; a main push continues the existing Portal-only deploy. SEC Import requires Migration already applied; do Migration, SEC Import, and Portal deploy in separate reviewed runs.
- Set protected variable `PRODUCTION_RESTORE_VALIDATION_REFERENCE` only after a non-empty production backup has been restored into an isolated validation database and its tables/counts checked. A DB-write dispatch must supply the exact same reference. The workflow checks the new backup archive and checksum; the isolated restore is performed separately.
- Ensure `.env.portal` contains three distinct role URLs with exact usernames `woori_portal`, `woori_portal_import`, and `woori_portal_migration`; all point to database `woori_today_portal` on an allowlisted host. Runtime remains read-only. SEC Import gets only SELECT/INSERT/UPDATE on `financial_companies`, `financial_company_facts`, and `data_collection_runs`, plus SELECT on source catalogs. Migration applies schema and narrowly grants Runtime/Import rights. No role receives SUPERUSER or broad ALL grants.
- Set secret `SEC_EDGAR_USER_AGENT` to an identifying Woori.today application name and monitored contact email. It is passed only to the short-lived SEC tool, not the Portal container.

## Production migration and World Bank import commands

These are one-off, fail-closed commands in the `db-tools` image. They require GitHub Actions on `main`, `DB_TARGET=production`, the protected approval secret, exact production database and hostname allowlist, and distinct role credentials. Writes additionally require a fresh, checked backup from the same workflow and a separately recorded isolated-restore validation reference. No command runs from Next.js build or application startup.

```text
node scripts/db/status-production.mjs
node scripts/data/import-world-bank-production.mjs --dry-run
node scripts/db/migrate-production.mjs --apply --backup-reference=<backup-file-name>
node scripts/db/status-production.mjs
node scripts/data/import-world-bank-production.mjs --apply --backup-reference=<backup-file-name>
node scripts/data/verify-world-bank-production.mjs
```

Financial operations are independent and do not run a World Bank Import unless that option is selected:

```text
node scripts/db/preflight-financial-production.mjs
node scripts/db/migrate-production.mjs --apply --backup-reference=<backup-file-name>
node scripts/db/grant-financial-runtime-read-production.mjs --apply --backup-reference=<backup-file-name>
node scripts/db/grant-financial-import-production.mjs --apply --backup-reference=<backup-file-name>
node scripts/data/financial-sec-production.mjs status
node scripts/data/import-sec-company-facts-production.mjs --dry-run
node scripts/data/import-sec-company-facts-production.mjs --apply --backup-reference=<backup-file-name>
node scripts/data/financial-sec-production.mjs verify
```

The SEC Import connects only through `DB_IMPORT_URL`, requires `SEC_EDGAR_USER_AGENT`, applies the provider request limit, and checks submissions for all 100 curated targets and upserts changed-company USD facts in one transaction. Failures roll back fact changes and attempt to record a failed collection run. Status and verification use the read-only Runtime role. The verifier checks all companies, provenance, non-empty facts, and duplicate keys; it never accesses price tables. SEC Import does not apply migrations implicitly: its preflight requires all 12 migrations unless `apply_migrations` is also selected.

`pnpm db:preflight:financial:production` is read-only. It checks role separation and identity, DB/host allowlist, migration prefix and SQL checksums, expected catalog IDs/seeds, World Bank tables and count, actual schema/indexes, and effective Runtime/Import grants. If production role settings are missing it reports that inspection was skipped without opening a DB connection. Any conflict or non-prefix Migration history blocks writes.

In the workflow the commands run inside the digest-pinned DB tools image on `compose_database`. `.env.portal` is a read-only mount, parsed by the helper, and only role URL variables enter the selected child process environment. Before status, dry-run, migration, or import, a preflight validates all three role URLs against the same allowlisted production database and opens a real PostgreSQL connection as each role to confirm `current_database()` and `current_user`. The database step is opt-in, runs status before and after Migration, performs a source-only import dry-run before migration, imports the seven reviewed World Bank indicators, and compares the stored reviewed scope to the bundled JSON snapshot after import. Four JSON-only indicators remain excluded from PostgreSQL. UPSERTs and collection-run records are handled by the existing importer. An import failure stops before Portal deployment.

The production wrappers cannot be exercised against production from a workstation or a non-main branch. Local tests exercise the guards without opening a DB connection. Never copy production URLs into `.env.local`; do not substitute the local development database for a production dry-run.

## Database read mode

- `WORLD_BANK_DATA_SOURCE` stays `json` by default. Database presence never changes this setting.
- Local DB mode is available only with `DB_TARGET=development` and a local host plus the exact development database.
- Production DB reads require all of `WORLD_BANK_DATA_SOURCE=db`, `DB_TARGET=production`, `WORLD_BANK_DB_PRODUCTION_ENABLED=true`, the exact database name, and a host listed in `PRODUCTION_DB_ALLOWED_HOSTS`.
- Repository queries and the comparison API restrict DB access to the seven reviewed indicators. Other registered indicators continue to read from the existing JSON snapshot; this routing is selected before a DB query and is not a fallback for DB errors. The API returns an unavailable response on approved DB errors; it does not substitute JSON data. Server page DB failures likewise do not silently switch sources. The Portal runtime `DATABASE_URL` must belong to a dedicated read-only role with only the SELECT grants required by the World Bank repository; migration and import URLs stay out of the Portal container.
- Keep production mode disabled until the production migration and import have completed, the role grants are checked, and the JSON/DB verifier reports no differences. Then enable it as a separate application configuration change, with a reviewed rollout. This workflow does not set the flag automatically.
- The runtime pool remains capped at two connections and is lazy. Never connect the application to `woori_today_portal_dev`.

## Release sequence

1. Review the exact commit and confirm the workflow change is present on `main`; confirm the full SHA and built portal/tools digests.
2. On the server, independently confirm Compose files, env files, `portal` service networks (`default` and `database`), DB hostname, healthcheck, free disk, and backup script behavior. Confirm a recent backup and an isolated restore of a non-empty database before first production data load.
3. Start a protected main workflow with DB changes disabled for an application-only release, or explicitly enable DB changes only after role URLs and the backup path are verified. The workflow always backs up before rollout.
4. Before applying an additive schema change, restore a representative non-empty backup into an isolated validation database, apply the pending Migration there, and start the previous Portal image against that migrated schema using only its runtime `DATABASE_URL`. Check health and the relevant World Bank routes. This validates old-image compatibility without connecting it to the production database.
5. For production DB changes, inspect pre-migration status, source dry-run, and the reviewed Migration set; then apply and confirm status. Import approved World Bank rows and verify exact keys/values. The workflow checks the currently running Portal health and HTTP endpoint again before rollout. A failure halts the workflow before image rollout.
6. The workflow pins the Portal digest, updates only Portal with `--no-deps`, checks container health and the configured HTTP endpoint, then retains the old image rollback tag.
7. After release, verify public routes, locale URLs, SEO metadata, logs without secret values, DB read permissions, and backup monitoring. Enable production DB read mode only in a later explicit configuration change after reconciliation.

`db-tools` and `portal` images are built from the same main SHA. The DB operation's production approval is deliberately separate from choosing an image. This repository cannot verify GitHub environment protection or the live environment files; those are release preconditions.

## Rollback and recovery

- If Portal health/HTTP checks fail, the workflow attempts to restore the previous local image ID through a retained rollback tag and updates only Portal. Confirm the restored health and public route. If the rollback command itself fails, stop and follow the operator's manual Compose procedure using the retained tag.
- After Migration and Import have completed, a later Portal image deployment failure does **not** automatically restore the database. The workflow rolls back only the Portal image; schema changes, imported observations, and collection records remain. The previous app image is safe only if the Migration passed the isolated compatibility check above. Database recovery requires a separately reviewed restore/reconciliation procedure; the workflow never runs reverse migrations or restores a backup automatically.
- The database is not automatically rolled back. Existing migrations are append-only and migration history is retained. The current 0000–0003 schema changes are additive; however, every future migration must be reviewed for backward compatibility before an old app image is considered a safe rollback target.
- If migration or import fails, halt. Preserve migration/run records and the backup; investigate before retrying. Never delete tables, rows, or migration history to force a rerun. Restore only under a separately reviewed recovery plan that accounts for writes since backup.
- A backup file is not proof of recoverability. Verify backup success, checksum/size, disk capacity, and isolated non-empty restore before the first production load, and periodically afterward.

## Local verification

Run in `develop` with only the local development connection configured:

```text
pnpm db:status
pnpm data:worldbank:verify
pnpm data:financial:status
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm exec drizzle-kit check
```

Also exercise the release guard with main and non-main refs in unit tests. Browser automation and the remote Compose preflight require separate availability; if not run, report them as unverified. Never test the deploy job by targeting a production server during this preparation.

## Remaining conditions

Previous reports recorded the main-only Environment policy and World Bank public API checks; they were not rechecked during this implementation. No production credentials or host access were available, so this task did not inspect current production roles, DB schema, backup restore, Actions reviewer settings, or Nginx. Before a production operation, confirm the `production` Environment reviewer/branch policy, host Compose/env/role configuration, a successful isolated restore, disk headroom, and the administrator-managed `/portal-api/` route. Use exactly one manual workflow selector per run; Migration, World Bank Import, SEC Import, and Portal deploy remain separate. `PRODUCTION_RESTORE_VALIDATION_REFERENCE` must point to an independently validated isolated restore. No operation was run against production during this task. The `publish.yml` weekday SEC refresh is opt-in only: it runs only on `main` when the repository variable `SEC_EDGAR_AUTO_REFRESH_ENABLED` is exactly `true`; it still enters the existing protected `production` Environment, checks the approval secret and restore-validation reference, creates and validates a fresh backup, and aborts if the 12-migration production schema or import grants are not ready. Set that variable only after production Migration and grants have been reviewed and applied; it does not migrate schema or deploy the Portal. The workflow has not been enabled in repository settings.

# Production deployment preparation

Status: **READY WITH CONDITIONS for a controlled first release; production was not accessed or changed.** Work is prepared on `develop` from the operator-supplied baseline `f353863`. The deployment workflow has not been run. Server configuration and credentials remain unverified.

## Scope and verified baseline

- All release operations are scoped to the `portal` Compose service. The workflow does not invoke `docker compose down`, recreate dependencies, edit either server environment file, or change MoneyBook, Calculator, Tools, Docs, Quiz, PostgreSQL, or Nginx.
- The existing local PostgreSQL baseline supplied for this work is `woori_today_portal_dev`, 4 migrations applied / 0 pending, 1,090 reviewed World Bank observations, and zero financial prices. The previously recorded JSON comparison is exact for the two approved indicators. Re-run the local commands listed below against the current checkout before release.
- Server facts are based only on operator notes: `/opt/services/compose/docker-compose.yml`, `.env.moneybook`, `.env.portal`, `portal`, `postgres`, `compose_database`, and `compose_default`. The remote Compose file, backup result, host, roles, healthcheck, and network are not inspected by this change.
- No production migration, import, DB query, deployment, or rollback was executed.

## Workflow controls

`.github/workflows/publish.yml` now:

1. Runs a release guard requiring `refs/heads/main` and event `push` or `workflow_dispatch`. A manually selected `develop` or `release/*` ref fails before image creation.
2. Builds portal and one-off DB tools images, tags them with the full commit SHA plus the unique Actions run/attempt, and passes their registry `sha256` digests between jobs. Deployment references the portal digest, not `latest` or a mutable tag; every retry gets a distinct tag.
3. Uses the protected GitHub Actions `production` environment. Repository administrators must configure its allowed deployment branch as `main` and required reviewers. Required environment/repository values are `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`, `PORTAL_HEALTH_URL`, `PRODUCTION_DB_ALLOWED_HOSTS`, and protected secret `PRODUCTION_OPERATION_APPROVAL`. Credentials are never written into the repository or printed by the workflow.
4. On the server reads both `.env.moneybook` and `.env.portal` for Compose interpolation without writing or replacing either file. It validates Compose, confirms `portal` has exactly `default` and `database` networks, and requires the configured Portal image before it does anything to the running service.
5. Runs the supplied backup script and verifies a newly created non-empty backup file before optional DB writes or Portal rollout.
6. Creates a rollback tag from the currently running Portal image ID. It pulls the explicit image digest and runs `up -d --no-deps portal`; failures after rollout begins trigger an attempt to restore that tag and wait for container health.
7. Waits for the Portal healthcheck and requests `PORTAL_HEALTH_URL`. A failed check fails the job and triggers image rollback. Backup, DB status, and validation output must not include environment values.

The release will stop safely if the live Compose format/network differs from the assumed service layout. An operator must inspect the live file and confirm the two env files and networks before enabling this workflow. The running Portal's Docker image ID must be inspectable, a healthcheck must exist, `jq` and `curl` must be installed, and the backup script must produce a new file under `/opt/backups/woori-portal`.

### Required GitHub configuration

- Configure the `production` environment to allow only `main`; add a required reviewer. This is an external GitHub setting and is not created by repository code.
- Set `PORTAL_HEALTH_URL` to an HTTP(S) endpoint that returns a successful status through the intended route. Do not use a URL containing credentials.
- Set `PRODUCTION_DB_ALLOWED_HOSTS` to the exact production PostgreSQL hostname(s) used by the isolated DB network. It is an allowlist, not a URL.
- Add the non-empty `PRODUCTION_OPERATION_APPROVAL` secret only to the protected environment. Database steps run only when a main-branch manual dispatch explicitly sets `apply_database_changes=true`.
- Ensure `.env.portal` contains three distinct role URLs: read-only `DATABASE_URL`, write-limited `DB_IMPORT_URL`, and DDL-capable `DB_MIGRATION_URL`; all must point to database `woori_today_portal` on an allowlisted host. Do not give the runtime role DDL or import-write rights.

## Production migration and World Bank import commands

These are one-off, fail-closed commands in the `db-tools` image. They require GitHub Actions on `main`, `DB_TARGET=production`, the protected approval secret, exact production database and hostname allowlist, and distinct role credentials. Writes additionally require evidence of a fresh backup created in the same workflow run. No command runs from Next.js build or application startup.

```text
node scripts/db/status-production.mjs
node scripts/data/import-world-bank-production.mjs --dry-run
node scripts/db/migrate-production.mjs --apply --backup-reference=<backup-file-name>
node scripts/db/status-production.mjs
node scripts/data/import-world-bank-production.mjs --apply --backup-reference=<backup-file-name>
node scripts/data/verify-world-bank-production.mjs
```

In the workflow the commands run inside the digest-pinned DB tools image on `compose_database`, with `.env.portal` injected only into the short-lived container. The database step is opt-in, runs status before and after Migration, performs a source-only import dry-run before migration, imports only `SL.UEM.TOTL.ZS` and `EG.ELC.ACCS.ZS`, and compares the stored approved scope to the bundled JSON snapshot after import. Six other World Bank indicators remain excluded. UPSERTs and collection-run records are handled by the existing importer. An import failure stops before Portal deployment.

The production wrappers cannot be exercised against production from a workstation or a non-main branch. Local tests exercise the guards without opening a DB connection. Never copy production URLs into `.env.local`; do not substitute the local development database for a production dry-run.

## Database read mode

- `WORLD_BANK_DATA_SOURCE` stays `json` by default. Database presence never changes this setting.
- Local DB mode is available only with `DB_TARGET=development` and a local host plus the exact development database.
- Production DB reads require all of `WORLD_BANK_DATA_SOURCE=db`, `DB_TARGET=production`, `WORLD_BANK_DB_PRODUCTION_ENABLED=true`, the exact database name, and a host listed in `PRODUCTION_DB_ALLOWED_HOSTS`.
- Repository queries and the comparison API restrict DB access to the two approved indicators. Unknown indicators fail closed. The API returns an unavailable response on DB errors; it does not substitute JSON data. Server page DB failures likewise do not silently switch sources.
- Keep production mode disabled until the production migration and import have completed, the role grants are checked, and the JSON/DB verifier reports no differences. Then enable it as a separate application configuration change, with a reviewed rollout. This workflow does not set the flag automatically.
- The runtime pool remains capped at two connections and is lazy. Never connect the application to `woori_today_portal_dev`.

## Release sequence

1. Review the exact commit and confirm the workflow change is present on `main`; confirm the full SHA and built portal/tools digests.
2. On the server, independently confirm Compose files, env files, `portal` service networks (`default` and `database`), DB hostname, healthcheck, free disk, and backup script behavior. Confirm a recent backup and an isolated restore of a non-empty database before first production data load.
3. Start a protected main workflow with DB changes disabled for an application-only release, or explicitly enable DB changes only after role URLs and the backup path are verified. The workflow always backs up before rollout.
4. For DB changes, inspect pre-migration status, source dry-run, reviewed Migration set, then apply and confirm status. Import approved World Bank rows and verify exact keys/values. A failure halts the workflow before image rollout.
5. The workflow pins the portal digest, updates only Portal with `--no-deps`, checks container health and the configured HTTP endpoint, then retains the old image rollback tag.
6. After release, verify public routes, locale URLs, SEO metadata, logs without secret values, DB read permissions, and backup monitoring. Enable production DB read mode only in a later explicit configuration change after reconciliation.

`db-tools` and `portal` images are built from the same main SHA. The DB operation's production approval is deliberately separate from choosing an image. This repository cannot verify GitHub environment protection or the live environment files; those are release preconditions.

## Rollback and recovery

- If Portal health/HTTP checks fail, the workflow attempts to restore the previous local image ID through a retained rollback tag and updates only Portal. Confirm the restored health and public route. If the rollback command itself fails, stop and follow the operator's manual Compose procedure using the retained tag.
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

The code-level blockers are addressed: main-only workflow gate, digest deployment, two env-file Compose reads, portal-only update/rollback attempt, guarded production migration/import, and explicit production DB-read mode. Release readiness remains conditional on external checks: configure GitHub environment protection, verify live Compose/env/role/host/health settings, verify a successful non-empty backup restore and free space, and review the final workflow from main. No production state was inspected, so do not treat this document as evidence of current server readiness.

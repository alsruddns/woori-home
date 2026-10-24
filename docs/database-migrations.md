# PostgreSQL and migration operations

## Current scope

Portal pages continue to read the checked-in JSON snapshots. The database foundation is additive and is not required by `next build`, `next dev`, or application startup. This keeps local builds and the current production service independent of database availability.

The first migration creates a normalized catalog for sources, datasets, countries, indicators, annual observations, and collection-run history. Data is imported separately by the World Bank pipeline; only indicators with a reviewed reuse basis are stored. Migration `0003_financial_market_data` adds reusable financial asset and daily price tables; those tables are empty unless a source is individually approved. EIA's targeted WTI, Brent, and Henry Hub daily spot series are blocked because EIA attributes them to Refinitiv/LSEG and downstream storage/display rights are unconfirmed. The JSON snapshot remains the default public data path.

## Local Windows development

The local PostgreSQL 16 service must already be installed. This project does not install or run PostgreSQL through Docker.

1. Copy `.env.example` to `.env.local` and enter the local PostgreSQL role/password. Keep `.env.local` untracked.
2. Ensure the local database `woori_today_portal_dev` exists and that the role can create tables and the `drizzle` migration schema.
3. Use `DB_TARGET=development` and local `DATABASE_URL` / `DB_MIGRATION_URL` values whose host is local and database name is exactly `woori_today_portal_dev`. A local owner role may be used for both while developing.
4. Run `pnpm db:status`, then `pnpm db:migrate`, and run `pnpm db:status` again. Re-running migrate applies no already-recorded migration.
5. Run `pnpm db:generate --name=<short_change_name>` after changing `src/lib/db/schema.ts`. Commit the generated SQL, `drizzle/meta/_journal.json`, and snapshot. Never edit or remove an applied migration; create a later migration instead.

The migration runner takes a PostgreSQL advisory lock, uses a pool capped at two connections, and stops before any pending migration containing a destructive statement. Only after a separate manual review can an operator explicitly permit that reviewed SQL with `DB_MIGRATION_ALLOW_DESTRUCTIVE_SQL=I_REVIEWED_THIS_MIGRATION`; production still requires its separate approval gate. Migration failure exits non-zero. Database errors never print the connection URL. `pnpm db:generate` is schema-to-SQL only and does not connect to a database. Do not use `drizzle-kit push` to bypass migration history.

For a fresh local PostgreSQL instance, a local administrator can create an isolated role and database with SQL equivalent to the following, replacing the password locally and never checking it in:

```sql
CREATE ROLE woori_portal_dev LOGIN PASSWORD '<LOCAL_SECRET>';
CREATE DATABASE woori_today_portal_dev OWNER woori_portal_dev;
```

This workspace has a local `woori_today_portal_dev` database owned by `woori_portal_dev`. Its application and migration URLs are stored in the ignored `.env.local`; neither the password nor URL belongs in version control. The administrator role is used only for local database provisioning. Development verification on 2026-10-25 found 12 migrations applied (0000-0011), 71,796 World Bank observations across seven reviewed indicators, 100 curated SEC companies with existing collection facts, and zero financial price observations. Production was not accessed from this workspace. No production host or database is configured in this workspace.

The SEC importer is target-isolated: `pnpm data:financial:sec:collect` is development-only. Production uses the protected SEC Import path described in `docs/production-deployment.md`.

## Database protections

- Development target is restricted in code to a local host and `woori_today_portal_dev`.
- Production target is restricted to the database name `woori_today_portal` and a hostname allowlisted in `PRODUCTION_DB_ALLOWED_HOSTS`. Production wrappers require a protected GitHub Actions run on `main` and `PRODUCTION_OPERATION_APPROVAL`; write operations also require a backup created and confirmed in that run.
- Production credentials and host are intentionally absent from the repository. Use distinct restricted application (`DATABASE_URL`), import (`DB_IMPORT_URL`), and DDL-capable migration (`DB_MIGRATION_URL`) roles. They must resolve to the same approved production DB, while using different credentials; keep them in the deployment secret store, not a developer `.env.local`. The portal database and roles must be independent of MoneyBook.
- Build, container startup, and the current publish workflow do not run migrations.
- The publish workflow handles main pushes, manual dispatch from `main`, and a disabled-by-default weekday SEC refresh schedule, uses full SHA tags and immutable image digests, reads `.env.moneybook` and `.env.portal` for Compose without modifying them, and updates only Portal. Manual dispatch independently selects Portal deploy, read-only DB preflight, Migration, World Bank Import, and SEC Import. Optional DB writes require protected manual approval, fresh backup checks, and a restore-validation reference. Actual production execution was not performed.

## Future production procedure (not executed here)

After a separately approved release only: run the read-only financial preflight; inspect production DB history/contents; validate a fresh backup and isolated restore; provision portal-only distinct roles; configure the protected GitHub `production` environment for `main`; set the exact DB host allowlist, approval secret, SEC User-Agent secret, and restore-validation reference; then follow `docs/production-deployment.md`. Migration failure stops later writes and application rollout. Do not add migrations to `next start`, Docker `CMD`, or application startup. Keep the prior digest and backup available. No production host, credential, database, container, or server configuration was accessed or changed for this task.

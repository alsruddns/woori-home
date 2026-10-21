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

This workspace has a local `woori_today_portal_dev` database owned by `woori_portal_dev`. Its application and migration URLs are stored in the ignored `.env.local`; neither the password nor URL belongs in version control. The administrator role is used only for local database provisioning. The current database has the checked-in Drizzle migrations applied; see `docs/data-pipeline.md` for World Bank import and verification procedures. No production host or database is configured in this workspace.

As of the EIA source review, the local development database has 4 migrations applied (0000–0003), 0 pending migrations, 1,090 existing World Bank observations, and 0 financial price observations. The EIA data-access probe was read-only and did not write to PostgreSQL.

## Database protections

- Development target is restricted in code to a local host and `woori_today_portal_dev`.
- Production target is restricted to the database name `woori_today_portal`; migration and status commands additionally require `DB_MIGRATION_ALLOW_PRODUCTION=I_HAVE_APPROVAL`.
- Production credentials and host are intentionally absent from the repository. Use a restricted application role in `DATABASE_URL` and a separate DDL-capable migration role in `DB_MIGRATION_URL`; keep both in the deployment secret store, not in a developer `.env.local`. The portal database and roles must be independent of MoneyBook.
- Build, container startup, and the current publish workflow do not run migrations.
- The current publish workflow triggers on `main` pushes and deploys the existing portal image. This `develop` change adds no workflow call to the production database and does not alter the deployment workflow.

## Future production procedure (not executed here)

After a separately approved release only: review the commit and pending SQL; verify a restorable backup; provision the portal-only roles and `woori_today_portal` database separately from MoneyBook; prepare the restricted application and migration connections as protected deployment secrets; execute the reviewed migration once from a controlled release runner with `DB_TARGET=production`, `DB_MIGRATION_URL`, and the explicit approval gate; verify `pnpm db:status`; then deploy the application with the restricted `DATABASE_URL`. A migration failure must stop the application rollout. Do not add migration execution to `next start`, Docker `CMD`, or an unreviewed `main` push workflow. Keep the prior application image and database backup available for recovery. No production host, credential, database, container, or server configuration was accessed or changed for this task.

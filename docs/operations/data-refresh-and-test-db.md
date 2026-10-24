# Data refresh and database test operations

## SEC collection health

`pnpm data:financial:sec:status:production` runs the existing read-only SEC production check. It requires the approved production runtime environment and reports total companies and facts, latest filing and financial period, plus the five latest collection runs. It does not import data. Do not put database URLs or credentials in the report.

The SEC schedule remains on the production Portal workflow at 10:17 UTC on weekdays. GitHub currently reports `SEC_EDGAR_AUTO_REFRESH_ENABLED=true`; confirm a schedule-triggered workflow run in Actions before treating the scheduled collection as exercised. A dispatch import remains subject to the existing backup, role, and approval guards.

## PostgreSQL integration tests

CI uses its ephemeral PostgreSQL 16 service. Locally, install Docker Compose and run `pnpm test:db`; it starts PostgreSQL, provisions a restricted `woori_test` owner role and the isolated `woori_today_portal_test` database, applies migrations, seeds a minimal World Bank fixture, runs the test suite, and removes only the container/network it created. The `woori_test` role is not a superuser and cannot create roles or databases. The named volume `woori_portal_test_data` is preserved for the next run. Add `-- --delete-volume` only when intentionally discarding that test volume.

To use a separately managed PostgreSQL 16 service, set `TEST_DATABASE_URL` to the dedicated `woori_test` role and `woori_today_portal_test` database before running `pnpm test:db`. The script verifies the connected database, role, and server version before migration. Production and development database names are rejected before connection. Never use production data as a test fixture.

The migration-only restore test remains separate and continues to use `woori-pg-restore-test` / `woori_migration_test`.

## VPS disk inventory

Run `pnpm ops:disk:report` on the VPS for filesystem, Docker image/container/build-cache, and volume inventory. It is read-only. It never removes images, stopped containers, volumes, database data, backups, or build cache. Review Docker volume names against the PostgreSQL data and rollback image protections before any separate manual cleanup.

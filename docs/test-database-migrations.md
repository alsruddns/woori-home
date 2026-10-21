# Isolated PostgreSQL migration test

`pnpm db:migrate:test` is a dedicated command for validating the existing Drizzle migrations against the isolated PostgreSQL 16 database. It does not import `.env`, `.env.local`, `DATABASE_URL`, `DB_MIGRATION_URL`, production approval secrets, or GitHub Actions context. The only connection setting it reads is `MIGRATION_TEST_DATABASE_URL`.

## Target restrictions

The command accepts only PostgreSQL on host `woori-pg-restore-test`, port `5432`, database `woori_migration_test`. Host overrides in URL query parameters are rejected. Production, development, MoneyBook, localhost, and all other targets are rejected before opening a connection. After connecting it checks `current_database()`, `current_user`, and PostgreSQL major version 16 again.

Do not put the URL in `.env`, `.env.local`, a command argument, or shell history. Run from a trusted shell that can resolve the isolated container name on `woori-restore-test-net`, and enter the URL through a hidden prompt:

```sh
read -rsp 'Isolated migration test URL: ' MIGRATION_TEST_DATABASE_URL
export MIGRATION_TEST_DATABASE_URL
pnpm db:migrate:test
result=$?
unset MIGRATION_TEST_DATABASE_URL
exit "$result"
```

Use the test database account and a URL shaped like `postgresql://<test-user>:<encoded-password>@woori-pg-restore-test:5432/woori_migration_test`. Do not use a production, development, or MoneyBook account. The value is never printed by the command.

## What the command checks

- On first run, the database must have no public tables and no Drizzle history schema. Any partial or unexpected state is rejected without attempting cleanup.
- The command applies the checked-in `0000`–`0003` Drizzle migrations from `drizzle/` without modifying their SQL, then invokes Drizzle Migration a second time.
- It requires exactly four unique migration history entries and zero pending entries after the second run.
- It verifies the expected eight public tables and twenty public indexes by name.
- A later rerun is accepted only when the existing schema and complete four-entry migration history match; it still invokes Migration again and verifies no duplicate history.
- Errors from PostgreSQL are reported by phase and error code only. Connection strings and passwords are suppressed.

The command never drops tables or resets the database. If a Migration fails partway, stop and inspect the isolated test database rather than deleting its history or schema automatically.

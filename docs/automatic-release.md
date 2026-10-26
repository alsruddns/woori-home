# Automatic Portal release flow

## Normal Portal changes

1. Push a change to `develop`.
2. `PR CI` runs against that exact commit, including PostgreSQL 16 integration tests, dependency audits, lint, tests, TypeScript, Drizzle migration checks, the Portal deploy-script syntax check, and the production build.
3. After a successful CI run, the trusted `Promote validated develop changes` workflow checks that `develop` has not advanced and that the candidate is within the bounded Portal UI/content file scope.
4. It opens or refreshes a `develop` to `main` pull request and enables squash auto-merge. The `main` ruleset requires a pull request and the `validate` status check, with strict up-to-date checks and no bypass actors.
5. After merge, the workflow synchronizes `main` back into `develop`, validates the synchronized commit, and dispatches the Portal release workflow.
6. The release uses the `production` Environment, which is restricted to `main`. It does not require a reviewer click or wait timer; the production operation secret and host allowlist remain required for database preflight.

The automatic promoter uses the policy script from trusted `main`. It rejects empty or oversized changes and sensitive paths including workflows, deployment scripts, migrations, data, API/security code, dependencies, and infrastructure. An identical `main`/`develop` tree is a successful no-op.

## Production database safety

Automatic releases first run read-only production preflight. Pending migrations are not applied merely because CI passed. The checked-in migration journal, exact SQL checksums, preflight state, data-integrity conditions, a fresh checksummed backup, and an isolated PostgreSQL 16 restore must all pass. The restore check compares protected World Bank, SEC, and financial table row counts with the read-only preflight.

The current allowlist is limited to the exact Coinranking identity and rights migrations. The collection/public-display rights remain pending and collection remains disabled. No Coinranking, SEC, or World Bank import is part of an automatic release. Any unlisted migration, unresolved preflight finding, failed backup/restore, or changed checksum blocks the release before database writes.

The release only replaces the Portal container. It runs health and route checks and retains the previous Portal image for Portal-only rollback. It does not change the shared Nginx configuration or deploy Calculator, Tools, MoneyBook, Docs, Quiz, or woori-ai-agent.

## Audit and recovery

Each release records the GitHub Actions run, commit, image digest, migration versions, backup checksum, isolated restore result, deployment result, and rollback status in the protected deployment log and Actions summary. Secret values are not written to those records.

If a health check fails after Portal replacement, the workflow attempts to restore the previous Portal image. It does not restore an old database backup over a database that may already contain new writes; database recovery is blocked for operator review if a migration or other write has already occurred.

# World Bank data pipeline

## Current flow

The checked-in `src/data/world-bank.json` remains the canonical input and the default source for pages. The monthly snapshot updater still fetches World Bank API v2 data, validates the response, and atomically preserves the prior snapshot if refresh fails. PostgreSQL import is a separate manual step; neither Next.js startup nor `next build` imports data.

The snapshot is about 470 KB and currently contains 4,514 non-null observations, 16 World Bank country/aggregate codes (15 ISO3 countries plus `WLD`), 8 indicators, and annual values from 1990 through 2025. `WLD` is stored as an aggregate with no ISO2 code. The present snapshot does not carry official region or income group metadata, so those optional country columns remain null until such metadata is deliberately sourced and verified. Country names are localized with the existing `Intl.DisplayNames` behavior for the portal's 15 locales.

## Rights and import scope

The World Bank Dataset Terms and summary terms allow commercial and noncommercial reuse under CC BY 4.0 by default, with attribution, but explicitly warn that some indicator data comes from third parties with separate terms. The WDI API does not expose a per-series license field. The import allowlist therefore requires a separate metadata/rights review:

| Indicator | Imported observations | Stored source and rights | Decision |
| --- | ---: | --- | --- |
| `SL.UEM.TOTL.ZS` | 560 | ILO Modelled Estimates (ILOEST); ILO datasets and reference metadata published from 2023-05-03 are CC BY 4.0 unless a particular item says otherwise. The modeled-estimate qualifier is retained. | Included |
| `EG.ELC.ACCS.ZS` | 530 | World Bank DataBank metadata labels the series CC BY 4.0; the source metadata names SE4ALL / Global Tracking Framework. It measures access, not consumption. | Included |
| Other six current snapshot indicators | 3,424 | Their WDI metadata names multiple third-party sources or does not establish compatible reuse for the exact series. | Excluded pending individual review |

Attribution is stored with the `data_sources` and `indicators` catalog records, including upstream provider, source URL, license URL, and a scope-specific rights note. The World Bank terms require attribution to the World Bank and data providers, prohibit implying endorsement, and require downstream recipients to retain attribution. Review [World Bank Dataset Terms](https://www.worldbank.org/ext/en/legal/terms-conditions/datasets), the [summary terms](https://data.worldbank.org/summary-terms-of-use), the [DataBank electricity metadata](https://databank.worldbank.org/metadataglossary/jobs/series/EG.ELC.ACCS.ZS), and the [ILO data rights policy](https://www.ilo.org/rights-and-permissions) again before expanding this allowlist. This review is limited to these two series and is not a blanket clearance for all WDI data.

## Schema relationships

- `data_sources` identifies World Bank and records the combined source-level notice that individual series require review.
- `datasets` links the `world-development-indicators` annual dataset to that source.
- `countries` uses ISO3 as the stable key, stores ISO2 separately, localized display names and an `is_aggregate` flag. `world_bank_code`, `region`, and `income_group` are separate nullable fields; ISO and World Bank codes are not assumed to be interchangeable for future data.
- `indicators` uses the WDI code as both stable ID and code. Localized labels and definitions are taken from the existing data-platform translation modules. Its JSON definition stores provider, license, attribution, source metadata, and reference-year meaning.
- `indicator_observations` references an indicator and an ISO3 country/aggregate. Its composite primary key `(indicator_id, country_iso3, reference_year)` prevents duplicate observations. Values are inserted as decimal strings into `NUMERIC(30,10)`.
- `data_collection_runs` records the selected scope, snapshot version/checksum, status, total count, and inserted/updated/skipped counts. A failed run records its stage and error category/message when the database remains available.

No null observation is fabricated. The JSON snapshot already omits null observations; zero and negative finite values remain valid values. Unsupported country codes, unreviewed indicator codes, invalid years, non-finite values, conflicting duplicates, unexpected units, and numeric values outside `NUMERIC(30,10)` integer capacity stop the import. Decimal values with more than ten fractional places are rounded to the column's scale using decimal-string arithmetic; the maximum rounding difference is `0.00000000005` and the verifier compares the normalized ten-place value. No JavaScript `Number` conversion is used to write a DB numeric value.

## Local commands

Configure `DB_TARGET=development`, and local `DATABASE_URL` / `DB_MIGRATION_URL` values pointing only to `woori_today_portal_dev` in `.env.local`. Keep this file untracked. Import code resolves the connection through the local-development safety guard; it cannot target a remote host or production database.

```powershell
pnpm db:status
pnpm data:worldbank:import -- --dry-run
pnpm data:worldbank:import
pnpm data:worldbank:verify
pnpm data:worldbank:status
```

Supported filters are `--dataset=world-development-indicators`, an approved `--indicator=...`, an ISO3 `--country=...`, and `--year-from=YYYY` / `--year-to=YYYY`. `--dry-run` validates and counts the selected JSON rows without writing to PostgreSQL. Unreviewed indicators are rejected instead of silently added. Use the commands repeatedly: exact observations are skipped, changed values or source revision timestamps are UPSERTed, and inserted/updated/skipped counts are recorded. Import uses a PostgreSQL advisory lock, small catalog transactions, and observation transactions of at most 250 rows. An interrupted run retains committed batches, records failure when possible, and can be safely rerun to reconcile the same snapshot.

`data:worldbank:verify` compares the imported licensed subset by exact indicator/country/year key and ten-place numeric value. It reports JSON and DB counts, latest reference years, representative Korea and World aggregate values, and the population/GDP examples that remain excluded. Those excluded values are not counted as DB mismatches because they are outside the reviewed storage scope. A difference inside the approved subset exits nonzero.

## Server reads and source switch

`src/lib/db/world-bank-repository.ts` is server-only and exposes bounded catalog, country series, latest-value, and country-comparison queries. The pool is the existing lazy pool capped at two connections. The existing `/api/data-compare` handler and country comparison page support the explicit `WORLD_BANK_DATA_SOURCE` setting:

- Default or `WORLD_BANK_DATA_SOURCE=json`: preserve the current JSON behavior and cache headers.
- `WORLD_BANK_DATA_SOURCE=db`: allowed only when `DB_TARGET=development` and `DATABASE_URL` passes the local database guard. The country comparison page starts with the reviewed unemployment series and offers only unemployment and electricity access. DB responses are uncached. Missing DB data or a DB failure is returned as an error, never replaced with a different year or JSON value.

The world overview, static country pages, indicator pages, metadata, sitemap, and other public routes continue to use the JSON snapshot. The DB-mode comparison page is already request-rendered because it reads URL search parameters. Production defaults to JSON, and no deployment workflow or production cron was changed. When an import is verified and the comparison page is intentionally selected for DB validation, set the flag only in the local `.env.local`; remove it or set it to `json` to return to the default.

## Refresh and recovery

The current API updater remains a snapshot job and is not wired to PostgreSQL automatically. Review rights and API metadata before adding a series. For a future scheduled import, run the snapshot validation first, then the guarded import, then the DB verifier and status command. Do not enable Actions, a server cron, or production DB mode as part of this local development process.

If an import fails after earlier 250-row batches committed, retain the run record and rerun the same checked-in snapshot after correcting the issue. UPSERT makes a retry idempotent. Do not truncate or delete tables to recover. If a new schema is needed, generate a new Drizzle migration; never edit an applied migration.

# World Bank data pipeline

## Current flow

The checked-in `src/data/world-bank.json` remains the canonical input and the default source for pages. The monthly snapshot updater still fetches World Bank API v2 data, validates the response, and atomically preserves the prior snapshot if refresh fails. PostgreSQL import is a separate manual step; neither Next.js startup nor `next build` imports data.

The 2026-10-25 snapshot is about 13.3 MB and contains 126,038 non-null observations across 11 WDI indicators and 218 country/aggregate codes (217 economies plus `WLD`), covering 1960–2025. The 7 reviewed database indicators account for 71,796 observations; four additional WDI indicators remain JSON-only pending a separate storage review. `WLD` is an aggregate without ISO2. Country metadata includes the API's region and income-group fields, and country names are localized with `Intl.DisplayNames` for all 26 portal locales.

## Rights and import scope

The World Bank Dataset Terms and summary terms allow commercial and noncommercial reuse under CC BY 4.0 by default, with attribution, while warning that some indicators may carry third-party terms. WDI API responses do not expose per-series licensing, so database inclusion uses a reviewed indicator allowlist with DataBank metadata evidence. This is a decision for these specific WDI series, not a blanket clearance for other World Bank or upstream datasets:

| Indicator | Imported observations | Stored source and rights | Decision |
| --- | ---: | --- | --- |
| `SP.POP.TOTL` | 14,358 | DataBank series metadata: CC BY 4.0; provider attribution retained. | Included |
| `NY.GDP.MKTP.CD` | 11,830 | DataBank series metadata: CC BY 4.0; current US dollars. | Included |
| `NY.GDP.PCAP.KD` | 11,599 | DataBank series metadata: CC BY 4.0; constant 2015 US dollars per person. | Included |
| `NY.GDP.MKTP.KD.ZG` | 11,473 | DataBank series metadata: CC BY 4.0; real GDP growth, not market-price growth. | Included |
| `FP.CPI.TOTL.ZG` | 9,196 | DataBank series metadata: CC BY 4.0; annual consumer price inflation. | Included |
| `SL.UEM.TOTL.ZS` | 6,566 | ILO Modelled Estimates (ILOEST); ILO datasets and reference metadata published from 2023-05-03 are CC BY 4.0 unless a particular item says otherwise. The modeled-estimate qualifier is retained. | Included |
| `EG.ELC.ACCS.ZS` | 6,774 | DataBank metadata labels the series CC BY 4.0; provider metadata names SE4ALL / Global Tracking Framework. It measures access, not consumption. | Included |
| Four other snapshot indicators | 54,242 | No reviewed database-storage approval recorded for these series. | JSON only |

Attribution is stored with `data_sources` and `indicators`, including provider, official series metadata URL, license URL, terms version, and review dates. The World Bank terms require attribution to the World Bank and data providers, prohibit implying endorsement, and require downstream recipients to retain attribution. See [World Bank Dataset Terms](https://www.worldbank.org/ext/en/legal/terms-conditions/datasets), [summary terms](https://data.worldbank.org/summary-terms-of-use), and the official DataBank metadata for [population](https://databank.worldbank.org/metadataglossary/world-development-indicators/series/SP.POP.TOTL), [GDP](https://databank.worldbank.org/metadataglossary/world-development-indicators/series/NY.GDP.MKTP.CD), [GDP per capita](https://databank.worldbank.org/metadataglossary/world-development-indicators/series/NY.GDP.PCAP.KD), [GDP growth](https://databank.worldbank.org/metadataglossary/world-development-indicators/series/NY.GDP.MKTP.KD.ZG), [inflation](https://databank.worldbank.org/metadataglossary/world-development-indicators/series/FP.CPI.TOTL.ZG), [unemployment](https://databank.worldbank.org/metadataglossary/world-development-indicators/series/SL.UEM.TOTL.ZS), and [electricity access](https://databank.worldbank.org/metadataglossary/world-development-indicators/series/EG.ELC.ACCS.ZS). Review these sources again before extending the allowlist.

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

`data:worldbank:verify` compares the seven-indicator reviewed subset by exact indicator/country/year key and ten-place numeric value. It reports JSON and DB counts, latest reference years, representative Korea and World aggregate values. Other JSON-only indicators are outside the import comparison scope. A difference inside the approved subset exits nonzero.

## Server reads and source switch

`src/lib/db/world-bank-repository.ts` is server-only and exposes bounded catalog, country series, latest-value, and country-comparison queries. The pool is the existing lazy pool capped at two connections. The country comparison page calls the Portal-owned `GET /portal-api/world-bank/compare` handler, which supports the explicit `WORLD_BANK_DATA_SOURCE` setting. The previous `/api/data-compare` URL was removed: its production response is not produced by this Next.js handler and returns an authentication error plus a `/api`-scoped session cookie. The Nginx location and upstream are not present in this repository, so their exact configuration still needs server-side confirmation. The Portal now uses a non-conflicting route namespace; no Nginx or MoneyBook route was modified.

- Default or `WORLD_BANK_DATA_SOURCE=json`: preserve the current JSON behavior and cache headers.
- `WORLD_BANK_DATA_SOURCE=db`: local use requires `DB_TARGET=development` and `DATABASE_URL` to pass the local database guard. Production use additionally requires `DB_TARGET=production`, `WORLD_BANK_DB_PRODUCTION_ENABLED=true`, the exact production database, and a host in `PRODUCTION_DB_ALLOWED_HOSTS`. The seven reviewed indicators route to PostgreSQL. Four indicators with JSON-only rights status remain on the checked-in snapshot. This is an explicit per-indicator source policy, not a fallback after a database error. DB responses are uncached. Missing approved DB data or a DB failure is returned as an error, never replaced with a different year or JSON value.

Production use requires the existing protected DB-first import workflow, successful seven-series JSON/DB reconciliation, and confirmation that the runtime role has SELECT-only access. Production runtime settings are managed through the protected deployment configuration; never pass `DB_MIGRATION_URL` or import credentials to the Portal. Do not enable DB mode until the route, grants, and JSON/DB parity are confirmed.

The world overview, country pages, indicator pages, metadata, and sitemap use the checked-in JSON snapshot. The country comparison page is request-rendered. Runtime DB reads are limited to the seven reviewed indicators and require the guarded settings described above; the runtime `DATABASE_URL` must be a dedicated read-only role. Import and migration credentials must never be present in the Portal runtime environment. Local DB validation uses the local development guard and must not target production.

## Refresh and recovery

The current API updater remains a snapshot job and is not wired to PostgreSQL automatically. Review rights and API metadata before adding a series. For a future scheduled import, run the snapshot validation first, then the guarded import, then the DB verifier and status command. Do not enable Actions, a server cron, or production DB mode as part of this local development process.

If an import fails after earlier 250-row batches committed, retain the run record and rerun the same checked-in snapshot after correcting the issue. UPSERT makes a retry idempotent. Do not truncate or delete tables to recover. If a new schema is needed, generate a new Drizzle migration; never edit an applied migration.

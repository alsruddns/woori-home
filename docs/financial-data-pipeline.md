# Financial data pipeline

Status: common PostgreSQL storage and read primitives are implemented; no stock, crypto, FX, or gold provider is currently cleared and configured for persisted public display. Existing JSON/mock/disabled behavior remains the default. This pipeline never runs during Next.js build or page startup.

## Shape and policy

`financial_assets` is the shared provider-linked instrument catalog for stocks, crypto, metals, energy, agricultural commodities, FX, rates, and indexes. `financial_daily_prices` holds daily observations in provider currency/unit, source-local reference date/timezone, optional OHLC/volume/market cap, and whether prices are adjusted. Composite key `(asset_id, source_id, reference_date, price_kind)` prevents duplicate series rows while allowing source comparison. `data_sources`, `datasets`, and `data_collection_runs` remain the source, dataset, and ingestion audit catalog. Numeric values stay decimal strings / PostgreSQL NUMERIC; do not convert stored prices through JavaScript `number`.

Current migrations: `0000_init_data_catalog`, `0001_worldbank_collection_counts`, `0002_worldbank_country_metadata`, then `0003_financial_market_data`. Never edit an already applied migration. Run `pnpm db:status` before/after migration. Migration is guarded to the local development DB.

## Dates and prices

- Stocks use exchange-local trading date/timezone. No row is fabricated for weekends, holidays, or delayed publication.
- Crypto daily candles use the provider's defined UTC day. Upbit data, if later approved, is labeled as the corresponding Upbit market pair rather than global price.
- Metal/energy/agriculture prices keep source-defined spot/futures/benchmark identity, currency and unit. Contract rolls and benchmark quotes are not silently merged.
- FX conversion requires the matching quote date and a separately approved FX series. No last-known-date fill is allowed.
- Missing values remain `NULL`; zero is a value. Rates may be negative. UI calculations are unavailable without comparable observations.
- `calculateMarketChange` uses exact fixed-point decimal arithmetic; presentation rounding occurs after calculation.

## Ingestion and access

Create a source and dataset only after review recorded in `docs/financial-data-sources.md`. Keep `data_sources.license_status` non-verified until the exact endpoint, plan, regions, retention, derivation, external display, attribution and any download/API restrictions are approved. Never write unlicensed data. `pnpm data:financial:import -- --file=<reviewed-export.json> [--dry-run]` accepts normalized JSON (`schemaVersion`, `sourceId`, `datasetId`, `snapshotVersion`, `assets`, `prices`), refuses unverified sources and duplicate/malformed rows, checks every referenced asset, and upserts observations on the composite key in 250-row transactions. It records checksum, scope, counts and partial failures in `data_collection_runs`. Identical observations are skipped; changed values update. Retries must respect documented per-provider limits. Scheduler adapters are manual/local only; no GitHub Actions, production cron, production API credentials or build-time fetch.

Server-only `src/lib/db/financial-repository.ts` exposes verified sources only and bounds history queries. It is not wired into public UI until at least one provider is approved and populated. There is no new public API endpoint. The existing market pages keep their JSON, disabled or clearly labeled mock states; no mock value is presented as an actual quote.

## Current data and next steps

Stocks: 0 stored. Crypto: 0 stored. Gold/FX: 0 stored. Energy/other commodities: 0 stored. Existing World Bank records and migration history are unaffected.

To activate a provider: (1) record provider contract/terms and exact series scope in source review, (2) set source metadata and verified rights in the local dev database, (3) implement a provider-specific adapter with explicit timeout/rate limits and decimal-string parsing, (4) dry-run and import into the local DB, (5) verify counts, duplicate rerun, changed values, gaps and source attribution, then (6) connect only validated pages with the existing noindex/SEO and cache rules. Keep downloaded/exportable data and public display as separate rights checks. Do not enable automatic production refresh until deployment/operations authorization is separately reviewed.

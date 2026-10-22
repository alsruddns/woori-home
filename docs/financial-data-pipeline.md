# Financial data pipeline

Status: PostgreSQL storage, a gated Upbit KRW daily-candle HTTP adapter, a shared bounded collector, transactional import, read-only finance APIs, and localized market/overview UI are implemented. Provider access and the right to republish, retain, cache, or redistribute that data are separate. Upbit's public Quotation endpoints are technically callable, but the reviewed terms do not confirm commercial republishing or persistent storage. No live market API request or price import was made; all price displays remain empty until the exact provider/dataset has a `verified` rights record. This pipeline never runs during Next.js build or page startup.

## Shape and policy

`financial_assets` is the shared provider-linked instrument catalog for stocks, crypto, metals, energy, agricultural commodities, FX, rates, and indexes. `financial_daily_prices` holds daily observations in provider currency/unit, source-local reference date/timezone, optional OHLC/volume/market cap, and whether prices are adjusted. Composite key `(asset_id, source_id, reference_date, price_kind)` prevents duplicate series rows while allowing source comparison. `data_sources`, `datasets`, and `data_collection_runs` remain the source, dataset, and ingestion audit catalog. Numeric values stay decimal strings / PostgreSQL NUMERIC; do not convert stored prices through JavaScript `number`.

`src/lib/data-platform/financial-provider.mjs` defines the provider response contract and bounded collection boundary. It refuses sources without verified rights and attribution, limits request dates and row counts, validates identifiers, timezones and decimal prices, rejects duplicate or out-of-range observations, applies request timeouts, retries retryable provider failures with capped backoff, and emits the normalized schemaVersion 1 import payload. Provider error messages and credentials are not copied into the safe error message. This adapter only normalizes data; it does not connect to PostgreSQL or make API requests by itself.

Current migrations: `0000_init_data_catalog`, `0001_worldbank_collection_counts`, `0002_worldbank_country_metadata`, then `0003_financial_market_data`. Never edit an already applied migration. Run `pnpm db:status` before/after migration. Migration is guarded to the local development DB.

## Dates and prices

- Stocks use exchange-local trading date/timezone. No row is fabricated for weekends, holidays, or delayed publication.
- Crypto daily candles use the provider's defined UTC day. Upbit data, if later approved, is labeled as the corresponding Upbit market pair rather than global price.
- Metal/energy/agriculture prices keep source-defined spot/futures/benchmark identity, currency and unit. Contract rolls and benchmark quotes are not silently merged.
- FX conversion requires the matching quote date and a separately approved FX series. No last-known-date fill is allowed.
- Missing values remain `NULL`; zero is a value. Rates may be negative. UI calculations are unavailable without comparable observations.
- `calculateMarketChange` uses exact fixed-point decimal arithmetic; presentation rounding occurs after calculation.

## Ingestion and access

Create a source and dataset only after review recorded in `docs/financial-data-sources.md`. Keep `data_sources.license_status` non-verified until the exact endpoint, plan, regions, retention, derivation, external display, attribution and any download/API restrictions are approved. Never write unlicensed data.

`src/lib/data-platform/providers/upbit.mjs` calls Upbit's official daily-candle endpoint, keeps KRW venue/pair identity, uses Asia/Seoul dates, paginates at the documented 200-candle cap, applies a per-request delay, and leaves market capitalization null because Upbit candles do not supply it. The adapter defaults to `unverified`. The collector checks the exact `data_sources` and `datasets` rows before making a network request; an unverified source therefore fails before any HTTP call. Only that one KRW crypto adapter is implemented. SEC/OpenDART fundamentals and Binance quotes remain cataloged as candidates; none is enabled.

Commands:

- `pnpm data:financial:providers` prints current technical access and separate display/storage rights states without opening a DB connection.
- `pnpm data:financial:collect -- --provider=upbit-quotation --market=krw [--date=YYYY-MM-DD | --start-date=YYYY-MM-DD --end-date=YYYY-MM-DD] [--limit=1..8] [--verbose]` collects only after the local development source and dataset are marked `verified` with attribution and source URL. It delegates writes to the existing import contract.
- `pnpm data:financial:dry-run -- --provider=upbit-quotation --market=krw [options]` validates an authorized collection and records a dry-run execution without writing prices.
- `pnpm data:financial:import -- --file=<reviewed-export.json> [--dry-run]` accepts normalized JSON (`schemaVersion`, `sourceId`, `datasetId`, `snapshotVersion`, `assets`, `prices`), refuses unverified sources and duplicate/malformed rows, checks every referenced asset, and upserts on `(asset_id, source_id, reference_date, price_kind)` inside one transaction. A failure rolls back all asset and price writes while the run log records the failure. It records checksum, scope, counts, and status in `data_collection_runs`.
- `pnpm data:financial:status` reports local asset/observation freshness; `pnpm data:financial:verify` performs the existing local transaction-only numeric/UPSERT/FK verification and rolls back.

Retry behavior is bounded, honors `Retry-After` up to the configured ceiling, and never logs provider responses or credentials. No recurring workflow, production collection credential, migration, or production DB write is configured. Future automatic collection requires an independently authorized provider rights record and operational DB role.

Public read API routes are under `/portal-api/finance/`: `overview`, `stocks`, `crypto`, `stocks/heatmap`, `crypto/heatmap`, `assets/{uuid}/history`, and `providers`. Listing APIs validate market/sort/search/date/page filters and cap page size at 100; history caps at 1,000 rows. A bounded 120-request-per-minute in-process client limit returns 429 with `Retry-After`; shared edge-level limits can be added independently. Responses use `Cache-Control: no-store` until caching rights are explicitly modeled. Financial reads require a separate `FINANCIAL_READONLY_DATABASE_URL`; the PostgreSQL connection sets `default_transaction_read_only=on`, a 5-second statement timeout, and a dedicated application name. Only joins to sources whose `license_status='verified'` can return assets or prices. Missing DB configuration returns a generic 503 and exposes no connection details.

The localized `/finance`, `/stocks`, and `/crypto` dashboards use those APIs. The stock page filters/searches/sorts verified assets and renders a market-cap treemap only when the returned rows are complete and share one venue/currency. The crypto page distinguishes KRW and USD quotes and only renders a treemap when all required market caps belong to one venue/currency. Prices, volume, market cap, date and source are localized for all 26 locales. Empty states remain explicit and never substitute mock values.

The importer refuses an observation whose effective provider revision time (`source_updated_at`, otherwise `fetched_at`) is older than the stored version for that asset/date/kind. `pnpm data:financial:verify` exercises this stale-write guard and numeric/UPSERT/FK checks inside a local development transaction that is rolled back. A periodic scheduler remains disabled until at least one provider and exact series are approved and credentials/limits are verified.

Server-only `src/lib/db/financial-repository.ts` remains a verified-only read helper for consumers outside the new parameterized finance query module. JSON/sample snapshots remain disabled and no mock value is presented as an actual quote.

## Current data and next steps

Stocks: 0 stored. Crypto: 0 stored. Gold/FX: 0 stored. Energy/other commodities: 0 stored. Existing World Bank records and migration history are unaffected.

EIA API-only availability probe for 2016-10-21 through 2026-10-21 returned 2,500 WTI rows, 2,531 Brent rows, and 2,512 Henry Hub spot rows, with the latest period 2026-10-14 for all three. This used EIA's public demo credential for read-only verification and wrote nothing to the database. The target observations come from Refinitiv/LSEG according to EIA's March 2026 STEO source note; the source review therefore blocks persistence and public display pending a specific downstream license. A personal EIA API key would not resolve that rights gap. No EIA-specific importer or public energy dashboard is activated while this block remains.

To activate a provider: (1) record provider contract/terms and exact series scope in source review, (2) set source metadata and verified rights in the local dev database, (3) implement a provider-specific adapter with explicit timeout/rate limits and decimal-string parsing, (4) dry-run and import into the local DB, (5) verify counts, duplicate rerun, changed values, gaps and source attribution, then (6) connect only validated pages with the existing noindex/SEO and cache rules. Keep downloaded/exportable data and public display as separate rights checks. Do not enable automatic production refresh until deployment/operations authorization is separately reviewed.

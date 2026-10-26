# Open financial prices — reviewed 2026-10-27 KST

## World Bank monthly gold

The [publisher's Pink Sheet page](https://www.worldbank.org/en/research/commodity-markets) links its monthly workbook and, under **Using this Data**, the [dataset summary terms](https://data.worldbank.org/summary-terms-of-use) and [data licensing policy](https://datacatalog.worldbank.org/public-licenses). These explicitly permit commercial and noncommercial copying, storage, redistribution, adaptation and public display under CC BY 4.0 unless metadata specifies otherwise. The actual downloaded October 2026 workbook was inspected for gold definition and additional restrictions: no gold-specific restriction was present. Source attribution and original publisher terms accompany the API and UI; no endorsement is implied.

The workbook defines gold as a monthly spot average of daily rates from June 2025; previously 99.5% fine London afternoon fixing, average of daily rates. This release distributes the World Bank **monthly series**, not an independently collected LBMA daily feed. USD/troy oz, monthly average, month-end reference key, publisher update date and collection time remain distinct. Excel binary serialization is explicitly normalized to USD cents; original workbook SHA-256 and URL are retained in collection scope. No daily OHLC, volume, FX or retail price is synthesized.

Actual download: 586,099 bytes, SHA-256 `ea1c350827878ea3bbe30e3cda16a13fd3bd5b409b8458940dc94a36b5a33154`. Parsed 801 months, January 1960–September 2026. Latest monthly gold average is USD 4,319/troy oz for September 2026; workbook published October 2, 2026. This download result is separate from production persistence and deployment, recorded in the protected Actions run.

## Alternative.me crypto

The official [Crypto API documentation](https://alternative.me/crypto/api/) **Terms of Use (II)** permits its API and API data in any way, explicitly including commercial projects. Unlike Coinranking, this permission does not impose a competing-offering or persistent-storage restriction. The documented API aggregates selected exchanges, updates about every five minutes, has a 60 requests/minute limit enforced across ten minutes, and requires no key. This release collects only one top-20 USD response per protected run. It preserves source identity, numeric asset IDs, observation timestamps, 24h change, USD volume and market cap, with visible attribution despite attribution being optional. These are source aggregate observations, not an exchange UTC closing price. No fees, registration, logo license, fear-and-greed data or unlicensed upstream raw feeds are involved.

Actual unauthenticated request returned HTTP 200 with BTC ID 1 and ETH ID 1027, valid USD prices and timestamps. Runtime collection revalidates identity and freshness; these documentation examples are not shipped as production quotes. Coinranking, GoldAPI, and private Binance research rights and data remain unchanged.

Excluded alternatives: [Coin Metrics community LICENSE](https://github.com/coinmetrics/data/blob/master/LICENSE) is noncommercial; [Kraken API notices](https://docs-legacy.kraken.com/api/docs/guides/global-intro/) require prior commercial permission; [Gemini](https://www.gemini.com/legal/market-data-agreement) requires commercial/redistribution agreement. CoinLore's broad content restrictions conflict with its free-API marketing and are not treated as a commercial license. CoinMarketCap Basic now advertises commercial rights but production requires an account/key, and no such key is provisioned here.

## Protected deployment and import

- No new tables or migration edits: reuse `data_sources`, `datasets`, `financial_assets`, `financial_daily_prices`, `data_collection_runs`.
- A separate `import_open_prices` selector in the existing production workflow keeps explicit write confirmation, protected operation secret, read-only preflight, RAM/disk checks, fresh backup/checksum, isolated PostgreSQL 16 restore and protected count checks. It cannot be combined with a Portal deploy or another import.
- After all source payloads validate, only the two new reviewed source IDs are inserted using the migration/catalog role (`ON CONFLICT DO NOTHING`, so a revoked provider is never reapproved). Price persistence uses the restricted import role, transactions, rights locks and advisory locks. Exact replays must insert/update zero prices, verified in the real protected import. Existing Coinranking rows and SEC/World Bank counts are compared before and after.
- Runtime endpoints use the read-only pool and existing IP rate limiter; visitor requests never contact suppliers. No raw full-file download feature or public API proxy is added.
- UI implements all 26 monthly labels, source/license/date/type disclosure, same-size crypto heatmap, native USD/troy-ounce gold table, missing-month chart gaps and Korean crypto alias search. Newly acquired history is not presented as real-time or previous-day exchange close.
- Actual CI, production counts, replay results, restore and image digest are recorded in the release PR and Actions logs. No positive operational outcome is inferred solely from unit fixtures.

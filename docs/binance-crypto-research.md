# Binance Vision personal crypto research

This feature is a private, non-commercial research tool. Binance Vision's dataset terms license the public archives under CC BY-NC-SA 4.0 for the stated non-commercial purposes. These records must not be connected to Portal APIs, an operating website, advertisements, a commercial product, or an externally reachable dashboard. Any redistributed derivative work must retain the same license and attribution. Confirm the current terms before continuing use.

The downloader follows Binance's Spot 1d archive layout, downloads the matching `.CHECKSUM` sidecar, verifies SHA-256 before parsing, and stores ZIPs outside the repository under `%LOCALAPPDATA%\WooriCryptoResearch\archive`. The official archive publishes daily and monthly files; Spot candle timestamps changed from milliseconds to microseconds on 2025-01-01. Each accepted daily candle is checked for a UTC midnight open, day-end close, valid OHLC ranges, numeric fields, and duplicate dates.

## Isolated local database

`BINANCE_RESEARCH_DATABASE_URL` must point to database `woori_crypto_research`, role `woori_crypto_research_app`, and a loopback host. The downloader rejects other hosts, database names, roles, and reuse of the Portal's database URL variables. A separate PostgreSQL 16 cluster should listen only on `127.0.0.1`; never put the research connection string in the Portal service environment. The local dashboard binds only to `127.0.0.1` and uses a read-only DB session.

On the configured workstation, the cluster is under `%LOCALAPPDATA%\WooriCryptoResearch\postgres-data`, uses port `55432`, and binds only to `127.0.0.1`. Its research application role is a non-superuser that owns the dedicated research database. Raw archives stay outside Git.

## Commands

```powershell
pnpm research:crypto:backfill  # last three years through the prior complete UTC day
pnpm research:crypto:update    # recheck and refresh the most recent seven complete UTC days
pnpm research:crypto:status    # per-asset date/count and ingest history
pnpm research:crypto:dashboard # localhost-only personal analysis UI on port 4173
```

Register the local Windows tasks after a successful backfill:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/data/register-binance-research-tasks.ps1
```

The task starts the private cluster at user logon and performs a daily update at 11:00 Asia/Seoul. It runs only for the current Windows user; it is not installed on the Portal server or in GitHub Actions.

The dashboard shows the per-asset latest UTC close, previous-close change, 7/30/90/365/1095-day close chart, daily volume, and equal-area change tiles. Tiles are not market-cap weighted. Search is local and makes no provider requests.

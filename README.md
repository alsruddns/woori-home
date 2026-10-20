# WOORI.TODAY Portal and Data Platform

The portal and data platform use the Next.js App Router. The public locale routes are `ko`, `en`, `ja`, `zh`, `es`, `pt-br`, `de`, `fr`, `vi`, `id`, `th`, `zh-tw`, `it`, `nl`, and `hi`.

## Run locally on Windows

Requirements: Node.js 20 or later and pnpm 9. PostgreSQL, Docker, API keys, and a network connection are not required to view the checked-in World Bank snapshot.

```powershell
cd C:\Users\achie\git\woori-home
git switch develop
pnpm install
pnpm dev
```

`pnpm dev` starts Next.js on port `3003`. Open <http://localhost:3003/ko>.

Useful pages:

- <http://localhost:3003/ko/world> — World Bank overview
- <http://localhost:3003/ko/countries> — country comparison dashboard
- <http://localhost:3003/ko/countries/kr> — South Korea dashboard
- <http://localhost:3003/ko/countries/us> — United States dashboard
- <http://localhost:3003/ko/countries/jp> — Japan dashboard
- <http://localhost:3003/ko/economy/gdp> — GDP indicator detail
- <http://localhost:3003/ko/economy/unemployment> — ILO modeled unemployment indicator detail
- <http://localhost:3003/en/countries> — English comparison dashboard
- <http://localhost:3003/ko/energy> — Energy dashboard with World Bank electricity-access data
- <http://localhost:3003/ko/energy/electricity-access> — Electricity-access indicator detail
- <http://localhost:3003/ko/science> — NASA/JPL near-Earth object snapshot
- <http://localhost:3003/ko/papers> — daily Crossref bibliographic discovery (no abstracts or generated summaries)
- <http://localhost:3003/en/papers> — English research discovery
- <http://localhost:3003/ko/commodities> — monthly commodity source and rights status (price republication is withheld)
- <http://localhost:3003/ko/science?date=2026-10-20> — Select an available UTC approach date

Useful stock and introduction pages:

- <http://localhost:3003/ko/stocks>
- <http://localhost:3003/ko/stocks?market=us&date=2026-10-19>
- <http://localhost:3003/en/stocks>
- <http://localhost:3003/ja/stocks>
- <http://localhost:3003/ko/about>

Country dashboards and charts use `src/data/world-bank.json`; the browser does not call World Bank. The comparison selector requests only the chosen series from the local `/api/data-compare` route. The monthly GitHub Actions workflow is only needed to refresh the committed snapshot.

The snapshot stores common source/provider metadata once per indicator and keeps observations compact. Source-specific reuse decisions and deferred data candidates are documented in `docs/data-source-audit.md`.

The stock market screen is a clearly disclosed interface example using synthetic sample entries. It is not live or historical market data, and no redistribution rights have been verified. Only dates present in each market's local sample snapshot show a treemap.

The energy dashboard uses the checked-in World Bank electricity-access series and does not call an external API while visitors browse. The science page uses a separate checked-in NASA/JPL NeoWs snapshot; the optional `NASA_API_KEY` is only used by the daily GitHub Actions refresh. Local development does not need the key or network access. NASA APOD imagery is not copied or displayed because rights vary by item.

Research discovery uses a small, checked-in Crossref metadata snapshot. The refresh requests bibliographic fields only; it does not collect abstracts or full text. Data refresh commands are `pnpm data:update:world-bank`, `pnpm data:update:nasa-neows`, and `pnpm data:update:research-papers`. Each source has a sibling status file with the last attempt/success, reference date, checksum, record count, result, and sanitized error category. Snapshot writes are atomic and an unsuccessful refresh retains the last valid data.

The update workflows check out and push `develop`. GitHub scheduled workflows run from the repository's default branch; since these three workflow files exist only on `develop`, neither schedule nor GitHub Actions manual dispatch is active yet. Locally, run the commands above while on `develop`. The only workflow currently listed by GitHub is `publish.yml` on `main`, which remains separate. A data commit to `develop` is not a production data delivery; a future approved integration still needs an atomic path from the validated snapshot to the running application and a separate publication-success record.

The commodities page links to the World Bank Pink Sheet source but does not copy its prices yet. Although a World Bank reproducibility catalog entry describes the dataset as CC BY 4.0 subject to additional terms, the workbook identifies third-party source series and the applicable series-level commercial republication conditions have not been reconciled. See `docs/data-source-audit.md`.

## Checks

```powershell
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
git diff --check
```

Production build output uses standalone mode and can be run with `pnpm start` after building.

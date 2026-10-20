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
- <http://localhost:3003/en/countries> — English comparison dashboard

Country dashboards and charts use `src/data/world-bank.json`; the browser does not call World Bank. The comparison selector requests only the chosen series from the local `/api/data-compare` route. The monthly GitHub Actions workflow is only needed to refresh the committed snapshot.

## Checks

```powershell
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
git diff --check
```

Production build output uses standalone mode and can be run with `pnpm start` after building.

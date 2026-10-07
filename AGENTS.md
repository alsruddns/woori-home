<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## WOORI.TODAY Portal rules

- The portal uses the Next.js App Router without `basePath`. The production service listens on port 3003 and builds with standalone output.
- Public portal pages use locale-first paths for exactly `ko`, `en`, `ja`, and `zh`. Do not infer a locale from `Accept-Language`.
- Use `https://www.woori.today` as the only SEO origin. Canonicals, Open Graph URLs, JSON-LD, robots, and sitemaps must not use the apex domain or localhost.
- Link to services only through `/{locale}/money`, `/{locale}/calculators`, and `/{locale}/tools`; detail links include the real service slug. Never introduce `/calculator`, `/tools`, or `/money` as service URLs.
- Keep portal sitemap ownership to portal pages only. Calculator, Tools, and MoneyBook maintain their own sitemap endpoints.
- Describe only features recorded as implemented in MoneyBook and only public entries from the Calculator and Tools registries.
- Keep all user-facing content naturally translated into every supported locale and make the language switch preserve the current path.
- Before completion run `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build`.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/site";
import { financialOverviewCopy } from "@/lib/data-platform/financial-overview-copy";
import { financialUiCopy } from "@/lib/data-platform/financial-ui-copy";

type Asset = { id: string; symbol: string; name: string; venue: string; currency: string; close: string | null; changePercent: string | null; referenceDate: string | null; sourceName: string; sourceUrl: string; };
type MarketKey = "usStocks" | "krStocks" | "krwCrypto" | "usdCrypto";
const markets: Array<{ key: MarketKey; href: string; query: string }> = [
  { key: "usStocks", href: "/stocks", query: "market=us" },
  { key: "krStocks", href: "/stocks", query: "market=kr" },
  { key: "krwCrypto", href: "/crypto", query: "market=krw" },
  { key: "usdCrypto", href: "/crypto", query: "market=usd" },
];

export function FinancialOverviewDashboard({ locale }: { locale: Locale }) {
  const copy = financialOverviewCopy[locale];
  const ui = financialUiCopy[locale];
  const [assets, setAssets] = useState<Record<MarketKey, Asset[]>>({ usStocks: [], krStocks: [], krwCrypto: [], usdCrypto: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(markets.map(async ({ key, href, query }) => {
      const response = await fetch(`/portal-api/finance/${href.slice(1)}?${query}&pageSize=5&sort=changePercent&order=desc`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) return [key, []] as const;
      const result = await response.json() as { data: Asset[] };
      return [key, result.data] as const;
    })).then((entries) => {
      setAssets(Object.fromEntries(entries) as Record<MarketKey, Asset[]>);
    }).catch(() => {
      if (!controller.signal.aborted) setAssets({ usStocks: [], krStocks: [], krwCrypto: [], usdCrypto: [] });
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return <>
    <header className="platform-page-heading financial-overview-heading"><span className="platform-eyebrow">{copy.title}</span><h1>{copy.title}</h1><p>{copy.description}</p></header>
    <section className="financial-overview-grid" aria-label={copy.title}>
      {markets.map(({ key, href, query }) => <article className="financial-overview-card" key={key}>
        <h2><Link href={`/${locale}${href}?${query}`}>{copy[key]}</Link></h2>
        {loading ? <p role="status">{ui.loading}</p> : assets[key].length ? <>
          <ul>{assets[key].map((asset) => <li key={asset.id}>
            <span><strong>{asset.symbol}</strong><small>{asset.name}</small></span>
            <span className="financial-overview-quote">{asset.close === null ? "—" : new Intl.NumberFormat(locale, { style: "currency", currency: asset.currency, maximumFractionDigits: 8 }).format(Number(asset.close))}
              <small>{asset.changePercent === null ? "—" : new Intl.NumberFormat(locale, { style: "percent", signDisplay: "always", maximumFractionDigits: 2 }).format(Number(asset.changePercent) / 100)}</small></span>
          </li>)}</ul>
          <p className="financial-overview-source"><a href={assets[key][0].sourceUrl} target="_blank" rel="noreferrer">{assets[key][0].sourceName}</a> · {assets[key][0].referenceDate ?? "—"}</p>
        </> : <p className="financial-overview-empty">{copy.noData}</p>}
      </article>)}
    </section>
  </>;
}

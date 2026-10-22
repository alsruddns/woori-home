"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Locale } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { stockMarkets } from "@/lib/data-platform/registry";
import { stockCopy, weekdayNoSnapshot } from "@/lib/data-platform/stock-copy";
import { stockUnavailableCopy } from "@/lib/data-platform/stock-unavailable-copy";
import { isValidStockDate } from "@/lib/data-platform/stock-selection";
import { stockIssueCopy } from "@/lib/data-platform/market-issue-copy";
import { financialUiCopy } from "@/lib/data-platform/financial-ui-copy";
import { financialOverviewCopy } from "@/lib/data-platform/financial-overview-copy";
import { cryptoTreemapLayout, type CryptoCoinQuote } from "@/lib/data-platform/crypto-market.mjs";
import { FinancialPriceChart } from "./financial-price-chart";
import { CompanyFundamentalsPanel } from "./company-fundamentals-panel";
import { DatePicker } from "./date-picker";
import { useSnapshotQueryDate } from "./use-snapshot-query-date";

type FinancialAsset = {
  id: string; assetType: string; symbol: string; name: string; venue: string; countryCode: string | null;
  currency: string; sector: string | null; sourceName: string; sourceUrl: string; attribution: string | null;
  referenceDate: string | null; close: string | null; volume: string | null; marketCap: string | null;
  changePercent: string | null; fetchedAt: string | null;
};
type StockHeatmapResponse = { available: boolean; data: FinancialAsset[] };

export function StockMarketDashboard({ locale }: { locale: Locale }) {
  const search = useSearchParams();
  const router = useRouter();
  const platform = platformCopy[locale];
  const copy = stockCopy[locale];
  const rawMarket = search.get("market");
  const rawDate = search.get("date");
  const market = stockMarkets.find((item) => item.id === rawMarket) ?? stockMarkets[0];
  const invalidMarket = rawMarket !== null && market.id !== rawMarket;
  const { today } = useSnapshotQueryDate(marketTimeZone(market.id), []);
  const date = rawDate ?? "";
  const validDate = !date || isValidStockDate(date);
  const apiMarket = market.id === "us" ? "us" : market.id === "kospi" || market.id === "kosdaq" ? "kr" : null;
  const [assets, setAssets] = useState<FinancialAsset[]>([]);
  const [heatmapAssets, setHeatmapAssets] = useState<FinancialAsset[]>([]);
  const [sourceAsOf, setSourceAsOf] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState("symbol");
  const [order, setOrder] = useState("asc");
  const [loadedKey, setLoadedKey] = useState("");
  const finance = financialUiCopy[locale];
  const queryKey = `${apiMarket ?? ""}:${date}:${sort}:${order}:${searchText.trim()}`;
  const dataReady = loadedKey === queryKey;
  const loading = Boolean(apiMarket && !invalidMarket && validDate && !dataReady);
  const visibleAssets = dataReady ? assets : [];
  const heatmapCoins = useMemo(() => (dataReady ? heatmapAssets : []).flatMap((asset): CryptoCoinQuote[] => {
    const close = asset.close === null ? NaN : Number(asset.close);
    const marketCap = asset.marketCap === null ? null : Number(asset.marketCap);
    if (!Number.isFinite(close) || close <= 0) return [];
    return [{ id: asset.id, symbol: asset.symbol, name: asset.name, currency: asset.currency, close, marketCap }];
  }), [heatmapAssets, dataReady]);
  const heatmap = useMemo(() => cryptoTreemapLayout(heatmapCoins), [heatmapCoins]);
  const sectorHeatmap = useMemo(() => {
    if (!dataReady || !heatmap || !heatmapAssets.length) return [];
    const groups = new Map<string, FinancialAsset[]>();
    for (const asset of heatmapAssets) {
      const sector = asset.sector?.trim() || "other";
      groups.set(sector, [...(groups.get(sector) ?? []), asset]);
    }
    const sectorQuotes = [...groups].map(([sector, assets]) => ({
      id: sector, symbol: sector, name: sector, currency: "USD", close: 1,
      marketCap: assets.reduce((total, asset) => total + Number(asset.marketCap), 0),
    }));
    const sectorRects = cryptoTreemapLayout(sectorQuotes);
    if (!sectorRects) return [];
    return [...groups].flatMap(([sector, assets]) => {
      const sectorRect = sectorRects[sector];
      const quotes = assets.map((asset) => ({ id: asset.id, symbol: asset.symbol, name: asset.name, currency: asset.currency, close: Number(asset.close), marketCap: Number(asset.marketCap) }));
      const localRects = cryptoTreemapLayout(quotes);
      if (!sectorRect || !localRects) return [];
      return [{ sector, rect: sectorRect, assets: assets.map((asset) => ({ asset, rect: localRects[asset.id] })) }];
    });
  }, [dataReady, heatmap, heatmapAssets]);

  useEffect(() => {
    const controller = new AbortController();
    if (!apiMarket || invalidMarket || !validDate) {
      return () => controller.abort();
    }
    const params = new URLSearchParams({ market: apiMarket, pageSize: "100", sort, order });
    if (date) params.set("date", date);
    if (searchText.trim()) params.set("q", searchText.trim());
    const heatmapParams = new URLSearchParams({ market: apiMarket });
    if (date) heatmapParams.set("date", date);
    Promise.all([
      fetch(`/portal-api/finance/stocks?${params}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
        if (!response.ok) throw new Error("Financial market data unavailable");
        return response.json() as Promise<{ data: FinancialAsset[]; asOf: string | null }>;
      }),
      fetch(`/portal-api/finance/stocks/heatmap?${heatmapParams}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
        if (!response.ok) return { available: false, data: [] } satisfies StockHeatmapResponse;
        return response.json() as Promise<StockHeatmapResponse>;
      }),
    ]).then(([result, map]) => { setAssets(result.data); setSourceAsOf(result.asOf); setHeatmapAssets(map.available ? map.data : []); setLoadedKey(queryKey); })
      .catch(() => { if (!controller.signal.aborted) { setAssets([]); setHeatmapAssets([]); setSourceAsOf(null); setLoadedKey(queryKey); } });
    return () => controller.abort();
  }, [apiMarket, invalidMarket, validDate, date, sort, order, searchText, queryKey]);

  function setSelection(marketId: string, date?: string) {
    const query = new URLSearchParams({ market: marketId });
    if (date) query.set("date", date);
    router.push(`/${locale}/stocks?${query.toString()}`, { scroll: false });
  }

  const emptyMessage = invalidMarket || !apiMarket ? copy.noMarketSnapshots : !validDate ? copy.invalidDate : weekdayNoSnapshot[locale];

  return <>
    <nav className="platform-breadcrumb" aria-label={copy.title}><Link href={`/${locale}`}>{platform.categories[0]}</Link><span>/</span><span>{platform.categories[2]}</span></nav>
    <header className="platform-page-heading stock-page-heading"><span className="platform-eyebrow">{platform.categories[2]}</span><h1>{platform.categories[2]}</h1><p>{financialOverviewCopy[locale].description}</p></header>
    <p className="market-issues-shortcut"><Link href={`/${locale}/stocks/issues`}>{stockIssueCopy[locale].title} →</Link></p>

    <section className="stock-market-index-overview" aria-label={copy.marketNames.us}>
      <h2>{copy.marketNames.us}</h2>
      <div className="stock-market-index-grid">{["S&P 500", "NASDAQ Composite", "Dow Jones"].map((index) => <article key={index} className="stock-market-placeholder-card"><strong>{index}</strong><span>{copy.noSnapshotTitle}</span><small>{stockUnavailableCopy[locale]}</small></article>)}</div>
    </section>

    <section className="stock-sector-panel" aria-labelledby="stock-sector-heading">
      <header><h2 id="stock-sector-heading">{copy.sectorLabel} · {copy.marketCapLabel}</h2><p>{stockUnavailableCopy[locale]}</p></header>
      {sectorHeatmap.length ? <div className="stock-sector-heatmap" role="group" aria-label={`${copy.sectorLabel} · ${copy.marketCapLabel}`}>
        {sectorHeatmap.map(({ sector, rect, assets }) => <section key={sector} className="stock-sector-region" style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%` }} aria-label={copy.sectors[sector] ?? sector}>
          <h3>{copy.sectors[sector] ?? sector}</h3>
          {assets.map(({ asset, rect: tileRect }) => {
            const percent = asset.changePercent === null ? null : Number(asset.changePercent);
            const tone = percent === null ? "is-flat" : percent > 0 ? "is-up" : percent < 0 ? "is-down" : "is-flat";
            const change = percent === null ? "—" : new Intl.NumberFormat(locale, { style: "percent", signDisplay: "always", maximumFractionDigits: 2 }).format(percent / 100);
            return <article key={asset.id} className={`crypto-tile stock-sector-tile ${tone}`} style={{ left: `${tileRect.x}%`, top: `${tileRect.y}%`, width: `${tileRect.width}%`, height: `${tileRect.height}%` }} tabIndex={0} aria-label={`${asset.name} (${asset.symbol}) · ${copy.changeLabel}: ${change}`} title={`${asset.name} (${asset.symbol}) · ${change}`}><strong>{asset.symbol}</strong><span>{asset.name}</span><small>{change}</small></article>;
          })}
        </section>)}
      </div> : <div className="stock-market-placeholder" role="status"><p>{copy.noSnapshotTitle}</p><small>{stockUnavailableCopy[locale]}</small></div>}
      <p className="stock-heatmap-legend"><span className="stock-market-cap-legend">{copy.marketCapLabel}</span><span>{copy.changeLabel}</span></p>
    </section>

    <section className="stock-market-movers" aria-label={copy.changeLabel}>
      <h2>{copy.changeLabel}</h2>
      <div className="stock-market-movers-grid">{[[copy.up, "gainers"], [copy.down, "losers"]].map(([label, key]) => <article key={key} className="stock-market-placeholder-card"><strong>{label}</strong><span>{copy.noSnapshotTitle}</span><small>{stockUnavailableCopy[locale]}</small></article>)}</div>
    </section>

    <h2 className="stock-market-filter-heading">{copy.marketLabel} · {copy.symbolLabel}</h2>
    <section className="stock-controls" aria-label={copy.title}>
      <label className="stock-control"><span>{copy.marketLabel}</span><select value={market.id} onChange={(event) => {
        const nextMarket = stockMarkets.find((item) => item.id === event.target.value);
        if (nextMarket) setSelection(nextMarket.id, rawDate ?? undefined);
      }}>{stockMarkets.map((item) => <option key={item.id} value={item.id}>{copy.marketNames[item.id]}{item.benchmark ? ` · ${item.benchmark}` : ""}</option>)}</select></label>
      <label className="stock-control stock-date-control"><span>{copy.dateLabel}</span><DatePicker locale={locale} label={copy.dateLabel} value={validDate ? date : ""} today={today} max={today} availableDates={[]} onChange={(value) => { if (isValidStockDate(value) && value <= today) setSelection(market.id, value); }} /></label>
      <div className="stock-date-navigation"><button type="button" disabled>{copy.previousDate}</button><button type="button" disabled>{copy.nextDate}</button></div>
    </section>

    {apiMarket ? <section className="financial-market-data" aria-label={copy.title}>
      <div className="financial-market-toolbar">
        <label><span>{copy.symbolLabel}</span><input value={searchText} maxLength={80} onChange={(event) => setSearchText(event.target.value)} /></label>
        <label><span>{copy.changeLabel}</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="symbol">{copy.symbolLabel}</option><option value="changePercent">{copy.changeLabel}</option><option value="marketCap">{copy.marketCapLabel}</option><option value="volume">{finance.volume}</option></select></label>
        <button type="button" onClick={() => setOrder((value) => value === "asc" ? "desc" : "asc")}>{order === "asc" ? copy.up : copy.down}</button>
      </div>
      {loading ? <p role="status">{finance.loading}</p> : visibleAssets.length ? <>
        <p className="financial-market-asof">{copy.referenceDate}: {visibleAssets[0].referenceDate ?? "—"}{sourceAsOf ? ` · ${finance.updated}: ${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(sourceAsOf))}` : ""}</p>
        <FinancialPriceChart assetId={visibleAssets[0].id} locale={locale} currency={visibleAssets[0].currency} title={visibleAssets[0].name} />
        <div className="platform-table-scroll"><table className="platform-table"><thead><tr><th>{copy.symbolLabel}</th><th>{copy.companyLabel}</th><th>{copy.venueLabel}</th><th>{finance.price}</th><th>{copy.changeLabel}</th><th>{finance.volume}</th><th>{copy.marketCapLabel}</th><th>{copy.sourceLabel}</th></tr></thead><tbody>{visibleAssets.map((asset) => <tr key={asset.id}>
          <th scope="row">{asset.symbol}</th><td>{asset.name}</td><td>{asset.venue}</td>
          <td>{asset.close === null ? "—" : new Intl.NumberFormat(locale, { style: "currency", currency: asset.currency, maximumFractionDigits: 8 }).format(Number(asset.close))}</td>
          <td>{asset.changePercent === null ? "—" : new Intl.NumberFormat(locale, { style: "percent", signDisplay: "always", maximumFractionDigits: 2 }).format(Number(asset.changePercent) / 100)}</td>
          <td>{asset.volume === null ? "—" : new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(Number(asset.volume))}</td>
          <td>{asset.marketCap === null ? "—" : new Intl.NumberFormat(locale, { style: "currency", currency: asset.currency, maximumFractionDigits: 0 }).format(Number(asset.marketCap))}</td>
          <td><a href={asset.sourceUrl} target="_blank" rel="noreferrer">{asset.sourceName}</a></td>
        </tr>)}</tbody></table></div>
      </> : <section className="stock-empty-state" role="status"><h2>{copy.noSnapshotTitle}</h2><p>{emptyMessage}</p><p>{copy.sourceDisclosure}</p></section>}
    </section> : <section className="stock-empty-state" role="status"><h2>{copy.noMarketSnapshots}</h2><p>{emptyMessage}</p><p>{copy.sourceDisclosure}</p></section>}
    <CompanyFundamentalsPanel locale={locale} />
  </>;
}

export function StockMarketLoading({ locale }: { locale: Locale }) {
  const copy = stockCopy[locale];
  return <section className="stock-loading"><h1>{copy.title}</h1><p>{stockUnavailableCopy[locale]}</p></section>;
}

function marketTimeZone(market: string | null) {
  if (market === "us") return "America/New_York";
  if (market === "japan") return "Asia/Tokyo";
  if (market === "europe") return "Europe/London";
  return "Asia/Seoul";
}

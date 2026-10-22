"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/site";
import { cryptoCopy } from "@/lib/data-platform/crypto-copy";
import { cryptoTreemapLayout, dailyCloseChange, validUtcDate, type CryptoCoinQuote } from "@/lib/data-platform/crypto-market.mjs";
import { financialUiCopy } from "@/lib/data-platform/financial-ui-copy";
import { DatePicker } from "./date-picker";
import { FinancialPriceChart } from "./financial-price-chart";

type FinancialCryptoAsset = {
  id: string; symbol: string; name: string; venue: string; currency: string; unit: string;
  sourceName: string; sourceUrl: string; attribution: string | null; referenceDate: string | null;
  close: string | null; previousClose: string | null; changePercent: string | null;
  marketCap: string | null; volume: string | null; fetchedAt: string | null;
};

type FinanceListResponse = { data: FinancialCryptoAsset[]; asOf: string | null };
type FinanceHeatmapResponse = { available: boolean; data: FinancialCryptoAsset[] };

function asCoin(asset: FinancialCryptoAsset): CryptoCoinQuote | null {
  const close = Number(asset.close);
  if (!Number.isFinite(close) || close <= 0) return null;
  const marketCap = asset.marketCap === null ? null : Number(asset.marketCap);
  const volume = asset.volume === null ? null : Number(asset.volume);
  return { id: asset.id, symbol: asset.symbol, name: asset.name, currency: asset.currency, close,
    marketCap: marketCap !== null && Number.isFinite(marketCap) ? marketCap : null,
    volume: volume !== null && Number.isFinite(volume) ? volume : null,
    previousUtcClose: asset.previousClose === null ? null : Number(asset.previousClose) };
}

export function CryptoDashboard({ locale }: { locale: Locale }) {
  const copy = cryptoCopy[locale];
  const finance = financialUiCopy[locale];
  const router = useRouter();
  const search = useSearchParams();
  const requestedDate = search.get("date") ?? "";
  const market = search.get("market") === "usd" ? "usd" : "krw";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const validDate = !requestedDate || (validUtcDate(requestedDate) && requestedDate <= today);
  const [assets, setAssets] = useState<FinancialCryptoAsset[]>([]);
  const [heatmapAssets, setHeatmapAssets] = useState<FinancialCryptoAsset[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const queryKey = `${market}:${requestedDate}:${order}`;
  const dataReady = validDate && loadedKey === queryKey;
  const loading = validDate && !dataReady;
  const visibleAssets = dataReady ? assets : [];
  const coins = useMemo(() => (dataReady ? assets : []).map(asCoin).filter((coin): coin is CryptoCoinQuote => coin !== null), [assets, dataReady]);
  const heatmapCoins = useMemo(() => (dataReady ? heatmapAssets : []).map(asCoin).filter((coin): coin is CryptoCoinQuote => coin !== null), [heatmapAssets, dataReady]);
  const heatmap = useMemo(() => cryptoTreemapLayout(heatmapCoins), [heatmapCoins]);

  useEffect(() => {
    const controller = new AbortController();
    if (!validDate) {
      return () => controller.abort();
    }
    const params = new URLSearchParams({ market, pageSize: "100", sort: "changePercent", order });
    if (requestedDate) params.set("date", requestedDate);
    const heatmapParams = new URLSearchParams({ market });
    if (requestedDate) heatmapParams.set("date", requestedDate);
    const getJson = async <T,>(url: string) => {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Financial data unavailable");
      return response.json() as Promise<T>;
    };
    Promise.all([
      getJson<FinanceListResponse>(`/portal-api/finance/crypto?${params}`),
      getJson<FinanceHeatmapResponse>(`/portal-api/finance/crypto/heatmap?${heatmapParams}`),
    ]).then(([list, map]) => {
      setAssets(list.data);
      setAsOf(list.asOf);
      setHeatmapAssets(map.available ? map.data : []);
      setLoadedKey(queryKey);
    }).catch(() => {
      if (!controller.signal.aborted) { setAssets([]); setHeatmapAssets([]); setAsOf(null); setLoadedKey(queryKey); }
    });
    return () => controller.abort();
  }, [market, requestedDate, validDate, order, queryKey]);

  function chooseDate(date: string) {
    if (date && (!validUtcDate(date) || date > today)) return;
    const query = new URLSearchParams(search.toString());
    query.set("market", market);
    if (date) query.set("date", date); else query.delete("date");
    router.push(`/${locale}/crypto?${query.toString()}`, { scroll: false });
  }

  function chooseMarket(nextMarket: string) {
    const query = new URLSearchParams(search.toString());
    query.set("market", nextMarket);
    router.push(`/${locale}/crypto?${query.toString()}`, { scroll: false });
  }

  return <>
    <nav className="platform-breadcrumb" aria-label={copy.nav}><Link href={`/${locale}`}>{copy.nav}</Link><span>/</span><span>{copy.title}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">{copy.nav}</span><h1>{copy.title}</h1><p>{copy.intro}</p></header>
    <section className="crypto-market-controls" aria-label={copy.title}>
      <label><span>{copy.market}</span><select value={market} onChange={(event) => chooseMarket(event.target.value)}><option value="krw">KRW</option><option value="usd">USD</option></select></label>
      <label><span>{copy.date}</span><DatePicker locale={locale} label={copy.date} value={validDate ? requestedDate : ""} today={today} max={today} availableDates={[]} onChange={chooseDate} /></label>
      <button type="button" onClick={() => setOrder((value) => value === "asc" ? "desc" : "asc")}>{order === "desc" ? copy.up : copy.down}</button>
      <button type="button" disabled>{copy.previous}</button><button type="button" disabled>{copy.next}</button>
    </section>
    <p className="crypto-utc-note">{copy.utcNote}</p>
    {loading ? <p role="status">{finance.loading}</p> : coins.length ? <section className="crypto-market-data" aria-label={copy.title}>
      <p>{copy.date}: <time dateTime={visibleAssets[0]?.referenceDate ?? undefined}>{visibleAssets[0]?.referenceDate ?? "—"}</time> · {copy.source}: {visibleAssets[0]?.sourceName} · {finance.updated}: {asOf ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(asOf)) : "—"}</p>
      {visibleAssets[0] ? <FinancialPriceChart assetId={visibleAssets[0].id} locale={locale} currency={visibleAssets[0].currency} title={visibleAssets[0].name} /> : null}
      {heatmap ? <div className="crypto-heatmap" role="group" aria-label={`${copy.marketCap} · ${assets[0]?.referenceDate ?? ""}`}>{heatmapCoins.map((coin) => {
        const move = dailyCloseChange(coin, coin.previousUtcClose ? { ...coin, close: coin.previousUtcClose } : undefined);
        const tone = move ? move.amount > 0 ? "is-up" : move.amount < 0 ? "is-down" : "is-flat" : "is-flat";
        const change = move ? new Intl.NumberFormat(locale, { style: "percent", signDisplay: "always", maximumFractionDigits: 2 }).format(move.percent / 100) : "—";
        const a11y = `${coin.name} (${coin.symbol}) · ${copy.price}: ${new Intl.NumberFormat(locale, { style: "currency", currency: coin.currency, maximumFractionDigits: 8 }).format(coin.close)} · ${copy.change}: ${change}`;
        const rect = heatmap[coin.id];
        return <article key={coin.id} className={`crypto-tile ${tone}`} style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%` }} tabIndex={0} aria-label={a11y} title={a11y}><strong>{coin.symbol}</strong><span>{coin.name}</span><small>{change}</small></article>;
      })}</div> : null}
      <div className="platform-table-scroll"><table className="platform-table"><thead><tr><th>{copy.nav}</th><th>{copy.price}</th><th>{copy.change}</th><th>{copy.marketCap}</th><th>{finance.volume}</th><th>{copy.source}</th></tr></thead><tbody>{visibleAssets.map((asset) => <tr key={asset.id}>
        <th scope="row">{asset.name} ({asset.symbol})</th>
        <td>{asset.close === null ? "—" : new Intl.NumberFormat(locale, { style: "currency", currency: asset.currency, maximumFractionDigits: 8 }).format(Number(asset.close))}</td>
        <td>{asset.changePercent === null ? "—" : new Intl.NumberFormat(locale, { style: "percent", signDisplay: "always", maximumFractionDigits: 2 }).format(Number(asset.changePercent) / 100)}</td>
        <td>{asset.marketCap === null ? "—" : new Intl.NumberFormat(locale, { style: "currency", currency: asset.currency, maximumFractionDigits: 0 }).format(Number(asset.marketCap))}</td>
        <td>{asset.volume === null ? "—" : new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(Number(asset.volume))} {asset.unit}</td>
        <td><a href={asset.sourceUrl} target="_blank" rel="noreferrer">{asset.sourceName}</a></td>
      </tr>)}</tbody></table></div>
    </section> : <section className="crypto-empty-state" role="status"><h2>{copy.unavailableTitle}</h2><p>{!validDate ? copy.unavailableBody : copy.unavailableBody}</p><p>{copy.source}: {copy.sourcePending}</p>{requestedDate && validDate ? <p>{copy.date}: {requestedDate}</p> : null}</section>}
    <section className="crypto-issue-link"><h2>{copy.issues}</h2><p>{copy.issueDescription}</p><Link href={`/${locale}/crypto/issues`}>{copy.issueTitle}</Link></section>
  </>;
}

export function CryptoDashboardLoading({ locale }: { locale: Locale }) {
  return <section className="crypto-empty-state"><h1>{cryptoCopy[locale].title}</h1><p>{cryptoCopy[locale].unavailableBody}</p></section>;
}

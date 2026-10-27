"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/site";
import { getCryptoPageCopy } from "@/lib/data-platform/crypto-page-copy";
import { RelatedGuides } from "./related-guides";
import { cryptoDirectoryCopy } from "@/lib/data-platform/crypto-directory-copy";
import { aggregatePriceLabel, stalePriceLabel } from "@/lib/data-platform/financial-price-status-copy";
import { dailyPriceChartSegments } from "@/lib/data-platform/financial-chart-series.mjs";
import { cryptoSnapshotCopy } from "@/lib/data-platform/crypto-snapshot-copy";
import { MarketDetailSheet } from "./market-detail-sheet";
import { companyFinancialTreemapControlsCopy } from "@/lib/data-platform/company-financial-treemap-controls-copy";
import { marketDetailCopy } from "@/lib/data-platform/market-detail-copy";
import { formatCryptoUsdPrice } from "@/lib/data-platform/crypto-price-format.mjs";
import { fetchRespectingRetryAfter } from "@/lib/data-platform/retry-after-fetch.mjs";

type Quote = {
  uuid: string; symbol: string; name: string; aliases: string[]; metadata?: { rank?: number };
  rank?: number; price: string; change24hPercent: string | null; marketCap: string | null;
  volume24h: string | null; observedAt: string;
};
type HistoryPoint = { timestamp: string; price: string; volume24h?: string | null };
type Payload = {
  status: string; provider?: string; stale?: boolean; currency: "USD"; referenceDate: string | null;
  latestDate: string | null; availableDates?: string[]; observedAt: string | null; data: Quote[];
  history?: HistoryPoint[]; attribution?: string; sourceUrl?: string; priceType?: string;
};
const periods = ["1d", "5d", "1m", "3m", "6m", "1y", "3y", "5y", "10y", "all"] as const;
const snapshotCache = new Map<string, { expiresAt: number; value: Payload | null; pending?: Promise<Payload | null> }>();
const historyCache = new Map<string, { expiresAt: number; value: Payload | null; pending?: Promise<Payload | null> }>();

function storeCryptoCache(cache: Map<string, { expiresAt: number; value: Payload | null; pending?: Promise<Payload | null> }>, key: string, entry: { expiresAt: number; value: Payload | null; pending?: Promise<Payload | null> }, capacity = 100) {
  const now = Date.now();
  for (const [cachedKey, cached] of cache) if (!cached.pending && cached.expiresAt <= now) cache.delete(cachedKey);
  cache.delete(key);
  cache.set(key, entry);
  while (cache.size > capacity) cache.delete(cache.keys().next().value!);
}

function normalize(value: string) { return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s._-]+/g, ""); }
function isDate(value: string | null, today: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value > today) return false;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}
function formatPercent(value: string | null | undefined, locale: string) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const amount = Number(value);
  return `${amount > 0 ? "+" : ""}${new Intl.NumberFormat(locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(amount)}%`;
}
function direction(value: string | null | undefined) { return value == null || !Number.isFinite(Number(value)) ? "is-unknown" : Number(value) > 0 ? "is-positive" : Number(value) < 0 ? "is-negative" : "is-neutral"; }
function formatTime(value: string | null | undefined, locale: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
}

export function CryptoDashboard({ locale }: { locale: Locale }) {
  const copy = getCryptoPageCopy(locale);
  const ui = cryptoDirectoryCopy[locale];
  const labels = cryptoSnapshotCopy[locale];
  const detailCopy = marketDetailCopy[locale];
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryDate = searchParams.get("date");
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = isDate(queryDate, today) ? queryDate! : today;
  const [payloadState, setPayloadState] = useState<{ requestedDate: string; value: Payload | null } | null>(null);
  const [snapshotErrorKey, setSnapshotErrorKey] = useState("");
  const [snapshotAttempt, setSnapshotAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"rank" | "price" | "change" | "cap">("rank");
  const [selectedUuid, setSelectedUuid] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [period, setPeriod] = useState<(typeof periods)[number]>("1m");
  const [historyState, setHistoryState] = useState<{ key: string; points: HistoryPoint[] } | null>(null);
  const payload = payloadState?.requestedDate === selectedDate ? payloadState.value : null;
  const loading = payloadState?.requestedDate !== selectedDate;

  useEffect(() => {
    if (queryDate !== selectedDate) router.replace(`/${locale}/crypto?date=${selectedDate}`, { scroll: false });
  }, [locale, queryDate, router, selectedDate]);

  useEffect(() => {
    let active = true;
    const cached = snapshotCache.get(selectedDate);
    if (cached && cached.expiresAt > Date.now() && !cached.pending) {
      Promise.resolve().then(() => {
        if (!active) return;
        setPayloadState({ requestedDate: selectedDate, value: cached.value });
        setSnapshotErrorKey(cached.value === null ? selectedDate : "");
      });
      return;
    }
    const entry = cached ?? { expiresAt: 0, value: null };
    const pending = entry.pending ?? fetchRespectingRetryAfter(`/portal-api/finance/crypto/alternative?date=${encodeURIComponent(selectedDate)}`)
      .then(async (response) => response.ok ? await response.json() as Payload : null)
      .catch(() => null)
      .then((result) => { entry.value = result; entry.expiresAt = Date.now() + 90_000; entry.pending = undefined; return result; });
    entry.pending = pending;
    storeCryptoCache(snapshotCache, selectedDate, entry);
    pending.then((result) => {
      if (!active) return;
      if (result) result.data = (result.data ?? []).map((coin) => ({ ...coin, aliases: aliasesFor(coin.symbol) }));
      setPayloadState({ requestedDate: selectedDate, value: result });
      setSnapshotErrorKey(result === null ? selectedDate : "");
      if (result?.data[0]) setSelectedUuid((current) => result.data.some((coin) => coin.uuid === current) ? current : result.data[0].uuid);
    });
    return () => { active = false; };
  }, [selectedDate, snapshotAttempt]);

  const normalized = normalize(search.trim());
  const matching = useMemo(() => (payload?.data ?? []).filter((coin) => !normalized || [coin.name, coin.symbol, ...coin.aliases].some((value) => normalize(value).includes(normalized))), [payload, normalized]);
  const coins = useMemo(() => [...matching].sort((a, b) => sort === "price" ? Number(b.price) - Number(a.price)
    : sort === "change" ? Number(b.change24hPercent ?? -Infinity) - Number(a.change24hPercent ?? -Infinity)
      : sort === "cap" ? Number(b.marketCap ?? -Infinity) - Number(a.marketCap ?? -Infinity)
        : Number(a.rank ?? a.metadata?.rank ?? Infinity) - Number(b.rank ?? b.metadata?.rank ?? Infinity)), [matching, sort]);
  const heatmap = coins.slice(0, 100);
  const selected = coins.find((coin) => coin.uuid === selectedUuid) ?? coins[0];
  const selectedUuidResolved = selected?.uuid ?? "";
  const historyKey = `${selectedDate}:${selectedUuidResolved}:${period}`;
  const history = historyState?.key === historyKey ? historyState.points : [];
  const [historyErrorKey, setHistoryErrorKey] = useState("");
  const historyError = historyErrorKey === historyKey;
  const historyLoading = detailOpen && historyState?.key !== historyKey && !historyError;
  const [historyAttempt, setHistoryAttempt] = useState(0);
  useEffect(() => {
    if (!detailOpen || !selectedUuidResolved || !payload?.data.length) return;
    let active = true;
    const cached = historyCache.get(historyKey);
    if (cached && cached.expiresAt > Date.now() && !cached.pending) {
      Promise.resolve().then(() => {
        if (!active) return;
        setHistoryState({ key: historyKey, points: cached.value?.history ?? [] });
        setHistoryErrorKey(cached.value === null ? historyKey : "");
      });
      return;
    }
    const entry = cached ?? { expiresAt: 0, value: null };
    const pending = entry.pending ?? fetchRespectingRetryAfter(`/portal-api/finance/crypto/alternative?asset=${encodeURIComponent(selectedUuidResolved)}&period=${period}&date=${encodeURIComponent(selectedDate)}`)
      .then(async (response) => response.ok ? await response.json() as Payload : null)
      .catch(() => null)
      .then((result) => { entry.value = result; entry.expiresAt = Date.now() + 120_000; entry.pending = undefined; return result; });
    entry.pending = pending;
    storeCryptoCache(historyCache, historyKey, entry);
    pending.then((result) => {
      if (!active) return;
      setHistoryState({ key: historyKey, points: result?.history ?? [] });
      setHistoryErrorKey(result === null ? historyKey : "");
    });
    return () => { active = false; };
  }, [period, payload?.data.length, selectedUuidResolved, selectedDate, historyKey, historyAttempt, detailOpen]);

  function chooseDate(value: string) {
    if (!isDate(value, today)) return;
    router.push(`/${locale}/crypto?date=${value}`, { scroll: false });
  }

  return <>
    <nav className="platform-breadcrumb" aria-label={ui.directoryTitle}><Link href={`/${locale}`}>{copy.nav}</Link><span>/</span><span>{copy.title}</span></nav>
    <header className="platform-page-heading crypto-page-heading"><span className="platform-eyebrow">{copy.nav}</span><h1>{copy.title}</h1><p>{aggregatePriceLabel[locale]} · {labels.observationType}</p></header>
    <section className="crypto-daily-dashboard coinranking-market" aria-labelledby="crypto-market-heading" aria-busy={loading}>
      <header className="crypto-daily-heading crypto-market-heading">
        <div><span className="platform-eyebrow">{payload?.provider ?? "Alternative.me"} · USD</span><h2 id="crypto-market-heading">{aggregatePriceLabel[locale]}</h2></div>
        <div className="crypto-daily-controls crypto-market-controls">
          <label className="crypto-directory-search"><span>{ui.search}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={ui.searchPlaceholder} autoComplete="off" /></label>
          <label><span>{labels.selectedDate}</span><input type="date" value={selectedDate} max={today} onChange={(event) => chooseDate(event.target.value)} /></label>
          <label><span>{labels.sort}</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="rank">{labels.sortRank}</option><option value="price">{labels.sortPrice}</option><option value="change">{labels.sortChange}</option><option value="cap">{labels.sortCap}</option></select></label>
        </div>
      </header>
      {payload?.data.length ? <p className="crypto-daily-asof"><span>{copy.date}</span><strong>{payload.referenceDate}</strong><span>· USD · {payload.priceType ?? labels.observationType} · {formatTime(payload.observedAt, locale)} UTC</span>{payload.sourceUrl ? <><span>·</span><a href={payload.sourceUrl} target="_blank" rel="noreferrer">{payload.attribution ?? "Alternative.me"}</a></> : null}</p> : null}
      {payload?.stale ? <p className="platform-data-note" role="status">{stalePriceLabel[locale]}</p> : null}

      {snapshotErrorKey === selectedDate ? <p className="platform-data-note" role="alert">{detailCopy.snapshotError} <button type="button" onClick={() => { snapshotCache.delete(selectedDate); setSnapshotErrorKey(""); setSnapshotAttempt((attempt) => attempt + 1); }}>{detailCopy.retry}</button></p> : null}
      {heatmap.length ? <div className="crypto-daily-heatmap" aria-label={`${labels.sortChange}: ${heatmap.length}`}>
        {heatmap.map((coin) => <button key={coin.uuid} type="button" className={`crypto-daily-tile ${direction(coin.change24hPercent)}${selected?.uuid === coin.uuid ? " is-selected" : ""}`} onClick={() => { setSelectedUuid(coin.uuid); setDetailOpen(true); }} aria-pressed={selected?.uuid === coin.uuid}>
          <span>{locale === "ko" && coin.aliases.length ? coin.aliases[0] : coin.name} <b>{coin.symbol}</b></span><strong>{formatCryptoUsdPrice(coin.price, locale)}</strong><small>{formatPercent(coin.change24hPercent, locale)} · 24h</small>
        </button>)}
      </div> : <div className="platform-empty-state" role="status"><p>{loading ? copy.sourcePending : labels.noSnapshot}</p>{payload?.latestDate && payload.latestDate !== selectedDate ? <button type="button" onClick={() => chooseDate(payload.latestDate!)}>{labels.latestSnapshot}: {payload.latestDate}</button> : null}</div>}

      {selected && payload?.data.length ? <MarketDetailSheet open={detailOpen} title={`${selected.name} (${selected.symbol}) · USD`} closeLabel={companyFinancialTreemapControlsCopy[locale].close} onClose={() => setDetailOpen(false)}><section className="crypto-daily-detail" aria-label={`${selected.name} ${labels.observationType}`}>
        <dl className="crypto-daily-metrics">
          <div><dt>{selected.name} ({selected.symbol})</dt><dd>{formatCryptoUsdPrice(selected.price, locale)}</dd></div>
          <div><dt>{labels.sortChange}</dt><dd className={direction(selected.change24hPercent)}>{formatPercent(selected.change24hPercent, locale)}</dd></div>
          {selected.marketCap ? <div><dt>{copy.marketCap}</dt><dd>{formatCryptoUsdPrice(selected.marketCap, locale)}</dd></div> : null}
          {selected.volume24h ? <div><dt>{copy.volume} · 24h</dt><dd>{formatCryptoUsdPrice(selected.volume24h, locale)}</dd></div> : null}
        </dl>
        <div className="crypto-daily-controls"><label><span>{labels.chartRange}</span><select value={period} onChange={(event) => setPeriod(event.target.value as (typeof periods)[number])}>{periods.map((value) => <option value={value} key={value}>{value.toUpperCase()}</option>)}</select></label></div>
        {historyLoading ? <div className="market-detail-skeleton" role="status" aria-label={labels.chartRange}><i /><i /><i /></div> : historyError ? <p className="platform-data-note" role="alert">{detailCopy.historyError} <button type="button" onClick={() => { historyCache.delete(historyKey); setHistoryState(null); setHistoryErrorKey(""); setHistoryAttempt((attempt) => attempt + 1); }}>{detailCopy.retry}</button></p> : history.length > 1 ? <div className="crypto-daily-chart-panel"><h3>{selected.name} · {labels.chart} · {payload.referenceDate}</h3><PriceChart points={history} title={`${selected.symbol} ${labels.chart}`} /><VolumeChart points={history} title={`${selected.symbol} ${copy.volume} 24h`} /></div>
          : <p className="platform-data-note" role="status">{period === "1d" ? labels.intradayNote : labels.historyPending}</p>}
        <p className="crypto-daily-attribution">{labels.observationType} · {payload.referenceDate} · {detailCopy.observedAt}: {formatTime(selected.observedAt, locale)} UTC · {detailCopy.source}: {payload.sourceUrl ? <a href={payload.sourceUrl} target="_blank" rel="noreferrer">{payload.attribution ?? "Alternative.me"}</a> : "Alternative.me"}</p>
      </section></MarketDetailSheet> : null}

      {payload?.data.length ? <>
        <p className="crypto-directory-count">{new Intl.NumberFormat(locale).format(payload.data.length)} · {labels.observationType}</p>
        <div className="crypto-daily-list">
          {coins.length ? coins.map((coin) => <button key={coin.uuid} type="button" className={selected?.uuid === coin.uuid ? "is-selected" : ""} onClick={() => { setSelectedUuid(coin.uuid); setDetailOpen(true); }} aria-pressed={selected?.uuid === coin.uuid}>
            <span>{locale === "ko" && coin.aliases.length ? coin.aliases[0] : coin.name} <b>{coin.symbol}</b></span><span>{formatCryptoUsdPrice(coin.price, locale)}</span><span className={direction(coin.change24hPercent)}>{formatPercent(coin.change24hPercent, locale)}</span>
          </button>) : <p className="platform-empty-state">{labels.emptySearch}</p>}
        </div>
      </> : null}
      {payload?.data.length ? <p className="crypto-daily-attribution"><a href="https://alternative.me/crypto/api/" target="_blank" rel="noreferrer">Data from Alternative.me</a> · {payload.referenceDate} UTC · {labels.changeMeaning}</p> : null}
    </section>
    <RelatedGuides locale={locale} slugs={["crypto-price-observations"]} />
  </>;
}

function aliasesFor(symbol: string): string[] {
  const aliases: Record<string, string[]> = { BTC:["비트코인","Bitcoin"],ETH:["이더리움","Ethereum"],XRP:["리플","XRP"],SOL:["솔라나","Solana"],DOGE:["도지코인","Dogecoin"],ADA:["에이다","Cardano"],BNB:["바이낸스 코인","BNB"],TRX:["트론","TRON"],LTC:["라이트코인","Litecoin"],AVAX:["아발란체","Avalanche"],DOT:["폴카닷","Polkadot"],LINK:["체인링크","Chainlink"] };
  return aliases[symbol] ?? [];
}

function PriceChart({ points, title }: { points: HistoryPoint[]; title: string }) {
  const segments = dailyPriceChartSegments(points.map((point) => ({ timestamp: point.timestamp, price: point.price })));
  if (!segments.length) return null;
  return <svg className="crypto-daily-chart" viewBox="0 0 100 100" role="img" aria-label={title} preserveAspectRatio="none"><line x1="0" y1="92" x2="100" y2="92" />{segments.map((segment,index)=>segment.length>1?<polyline key={index} points={segment.join(" ")} />:<circle key={index} cx={segment[0].split(",")[0]} cy={segment[0].split(",")[1]} r="1" fill="currentColor" />)}</svg>;
}

function VolumeChart({ points, title }: { points: HistoryPoint[]; title: string }) {
  const values = points.map((point) => Number(point.volume24h)).filter((value) => Number.isFinite(value) && value >= 0);
  if (values.length < 2) return null;
  const max = Math.max(...values) || 1;
  return <svg className="crypto-volume-history-chart" viewBox="0 0 100 32" role="img" aria-label={title} preserveAspectRatio="none">{values.map((value,index) => { const width=100/values.length;const height=value/max*29;return <rect key={`${index}-${value}`} x={index*width} y={31-height} width={Math.max(.4,width*.7)} height={height} />; })}</svg>;
}

export function CryptoDashboardLoading({ locale }: { locale: Locale }) {
  const copy = getCryptoPageCopy(locale);
  return <section className="crypto-empty-state"><h1>{copy.title}</h1><p>{copy.unavailableBody}</p></section>;
}

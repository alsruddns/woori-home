"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import cryptoPriceSnapshot from "@/data/crypto-prices.json";
import type { Locale } from "@/lib/site";
import { cryptoCopy } from "@/lib/data-platform/crypto-copy";
import { adjacentCryptoDates, cryptoDates, cryptoTreemapLayout, dailyCloseChange, isPublishableCryptoSnapshot, validUtcDate } from "@/lib/data-platform/crypto-market.mjs";
import type { CryptoSnapshot } from "@/lib/data-platform/crypto-market.mjs";
import { useTodayQueryDate } from "./use-today-query-date";

const snapshot = cryptoPriceSnapshot as unknown as CryptoSnapshot;

export function CryptoDashboard({ locale }: { locale: Locale }) {
  const copy = cryptoCopy[locale];
  const router = useRouter();
  const search = useSearchParams();
  const { today, selectedDate } = useTodayQueryDate();
  const dates = cryptoDates(snapshot);
  const requestedDate = search.get("date");
  const date = requestedDate ?? selectedDate;
  const validDate = !date || validUtcDate(date);
  const available = snapshot.snapshots.find((item) => item.referenceDate === date);
  const priorSnapshot = dates.filter((item) => item < date).at(-1);
  const previous = snapshot.snapshots.find((item) => item.referenceDate === priorSnapshot);
  const heatmap = available ? cryptoTreemapLayout(available.coins) : null;
  const neighbors = adjacentCryptoDates(dates, date);
  const validSnapshot = isPublishableCryptoSnapshot(snapshot);

  function chooseDate(date: string) {
    if (date && (!validUtcDate(date) || date > today)) return;
    const query = new URLSearchParams(search.toString());
    if (date) query.set("date", date); else query.delete("date");
    router.push(`/${locale}/crypto${query.size ? `?${query}` : ""}`, { scroll: false });
  }

  return <>
    <nav className="platform-breadcrumb" aria-label={copy.nav}><Link href={`/${locale}`}>{copy.nav}</Link><span>/</span><span>{copy.title}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">{copy.nav}</span><h1>{copy.title}</h1><p>{copy.intro}</p></header>
    <section className="crypto-market-controls" aria-label={copy.title}>
      <label><span>{copy.date}</span><input type="date" value={validDate ? date : ""} max={today} list="crypto-available-dates" onChange={(event) => chooseDate(event.target.value)} /></label>
      <datalist id="crypto-available-dates">{dates.map((date) => <option key={date} value={date} />)}</datalist>
      <button type="button" disabled={!neighbors.previous} onClick={() => neighbors.previous && chooseDate(neighbors.previous)}>{copy.previous}</button>
      <button type="button" disabled={!neighbors.next} onClick={() => neighbors.next && chooseDate(neighbors.next)}>{copy.next}</button>
      <button type="button" disabled={!dates.length || date === dates.at(-1)} onClick={() => chooseDate(dates.at(-1) ?? "")}>{copy.latest}</button>
    </section>
    <p className="crypto-utc-note">{copy.utcNote}</p>
    {validSnapshot && available ? <section className="crypto-market-data" aria-label={copy.title}>
      <p>{copy.date}: <time dateTime={available.referenceDate}>{available.referenceDate}</time> · {copy.source}: {snapshot.providerName}</p>
      {heatmap ? <div className="crypto-heatmap" role="group" aria-label={`${copy.marketCap} · ${available.referenceDate}`}>{available.coins.map((coin) => {
        const move = dailyCloseChange(coin, previous?.coins.find((item) => item.id === coin.id));
        const tone = move ? move.amount > 0 ? "is-up" : move.amount < 0 ? "is-down" : "is-flat" : "is-flat";
        const change = move ? new Intl.NumberFormat(locale, { style: "percent", signDisplay: "always", maximumFractionDigits: 2 }).format(move.percent / 100) : "—";
        const a11y = `${coin.name} (${coin.symbol}) · ${copy.price}: ${new Intl.NumberFormat(locale, { style: "currency", currency: coin.currency, maximumFractionDigits: 8 }).format(coin.close)} · ${copy.change}: ${change}`;
        const rect = heatmap[coin.id];
        return <article key={coin.id} className={`crypto-tile ${tone}`} style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%` }} tabIndex={0} aria-label={a11y} title={a11y}><strong>{coin.symbol}</strong><span>{coin.name}</span><small>{copy.change}: {change}</small></article>;
      })}</div> : null}
      <div className="platform-table-scroll"><table className="platform-table"><thead><tr><th>{copy.nav}</th><th>{copy.price}</th><th>{copy.change}</th><th>{copy.marketCap}</th><th>{copy.volume}</th></tr></thead><tbody>{available.coins.map((coin) => {
        const move = dailyCloseChange(coin, previous?.coins.find((item) => item.id === coin.id));
        const change = move ? new Intl.NumberFormat(locale, { style: "percent", signDisplay: "always", maximumFractionDigits: 2 }).format(move.percent / 100) : "—";
        return <tr key={coin.id}><th scope="row">{coin.name} ({coin.symbol})</th><td>{new Intl.NumberFormat(locale, { style: "currency", currency: coin.currency, maximumFractionDigits: 8 }).format(coin.close)}</td><td className={move ? move.amount > 0 ? "is-up" : move.amount < 0 ? "is-down" : "is-flat" : "is-flat"}>{change}</td><td>{coin.marketCap == null ? "—" : new Intl.NumberFormat(locale, { style: "currency", currency: coin.currency, maximumFractionDigits: 0 }).format(coin.marketCap)}</td><td>{coin.volume == null ? "—" : new Intl.NumberFormat(locale, { style: "currency", currency: coin.currency, maximumFractionDigits: 0 }).format(coin.volume)}</td></tr>;
      })}</tbody></table></div>
    </section> : <section className="crypto-empty-state" role="status"><h2>{copy.unavailableTitle}</h2><p>{copy.unavailableBody}</p><p>{copy.source}: {copy.sourcePending}</p>{date && validDate ? <p>{copy.date}: {date} · {copy.unavailableBody}</p> : null}</section>}
    <section className="crypto-issue-link"><h2>{copy.issues}</h2><p>{copy.issueDescription}</p><Link href={`/${locale}/crypto/issues`}>{copy.issueTitle}</Link></section>
  </>;
}

export function CryptoDashboardLoading({ locale }: { locale: Locale }) {
  return <section className="crypto-empty-state"><h1>{cryptoCopy[locale].title}</h1><p>{cryptoCopy[locale].unavailableBody}</p></section>;
}

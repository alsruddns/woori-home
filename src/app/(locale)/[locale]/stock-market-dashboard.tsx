"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Locale } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { stockMarkets } from "@/lib/data-platform/registry";
import { snapshotDatesForMarket, stockSnapshotForDate } from "@/lib/data-platform/mock-stocks";
import { stockCopy, weekdayNoSnapshot } from "@/lib/data-platform/stock-copy";
import { adjacentAvailableDates, classifyStockDate, isValidStockDate } from "@/lib/data-platform/stock-selection";

export function StockMarketDashboard({ locale }: { locale: Locale }) {
  const search = useSearchParams();
  const router = useRouter();
  const platform = platformCopy[locale];
  const copy = stockCopy[locale];
  const rawMarket = search.get("market");
  const market = stockMarkets.find((item) => item.id === rawMarket) ?? stockMarkets[0];
  const marketTitle = `${copy.marketNames[market.id]}${market.benchmark ? ` · ${market.benchmark}` : ""}`;
  const invalidMarket = rawMarket !== null && market.id !== rawMarket;
  const dates = [...snapshotDatesForMarket(market.id)].sort();
  const rawDate = search.get("date");
  const selectedDate = rawDate ?? dates.at(-1) ?? "";
  const localNow = new Date();
  const today = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, "0")}-${String(localNow.getDate()).padStart(2, "0")}`;
  const validDate = isValidStockDate(selectedDate);
  const dateStatus = invalidMarket ? "empty" : classifyStockDate(dates, selectedDate, today);
  const snapshot = dateStatus === "available" ? stockSnapshotForDate(market.id, selectedDate) : undefined;
  const latestDate = dates.at(-1);
  const { previous: earlierDate, next: laterDate } = adjacentAvailableDates(dates, selectedDate);
  const totalMarketCap = snapshot?.securities.reduce((sum, item) => sum + item.marketCap, 0) ?? 0;
  const currentMarketCap = (value: number) => `${market.currency} ${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)} ${copy.marketCapUnit}`;
  const changeText = (value: number) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "always" }).format(value / 100);
  const changeTone = (value: number) => value > 0 ? "is-up" : value < 0 ? "is-down" : "is-flat";

  function setSelection(marketId: string, date?: string) {
    const query = new URLSearchParams({ market: marketId });
    if (date) query.set("date", date);
    router.push(`/${locale}/stocks?${query.toString()}`, { scroll: false });
  }

  const emptyMessage = invalidMarket || !dates.length
    ? copy.noMarketSnapshots
    : dateStatus === "invalid"
      ? copy.invalidDate
      : dateStatus === "future"
        ? copy.futureDate
        : dateStatus === "weekend"
          ? copy.weekend
          : weekdayNoSnapshot[locale];

  return <>
    <nav className="platform-breadcrumb" aria-label={copy.title}><Link href={`/${locale}`}>{platform.categories[0]}</Link><span>/</span><span>{platform.categories[2]}</span></nav>
    <header className="platform-page-heading stock-page-heading"><span className="platform-eyebrow">{platform.categories[2]}</span><h1>{platform.categories[2]}</h1><p>{copy.intro}</p></header>
    <aside className="stock-example-notice" role="note"><strong>{copy.mockLabel}</strong><p>{copy.mockDisclosure}</p></aside>

    <section className="stock-controls" aria-label={copy.title}>
      <label className="stock-control"><span>{copy.marketLabel}</span><select value={market.id} onChange={(event) => {
        const nextMarket = stockMarkets.find((item) => item.id === event.target.value);
        if (nextMarket) setSelection(nextMarket.id, snapshotDatesForMarket(nextMarket.id).at(-1));
      }}>{stockMarkets.map((item) => <option key={item.id} value={item.id}>{copy.marketNames[item.id]}{item.benchmark ? ` · ${item.benchmark}` : ""}</option>)}</select></label>
      <label className="stock-control stock-date-control"><span>{copy.dateLabel}</span><input type="date" aria-label={copy.dateLabel} list={`stock-dates-${market.id}`} min={dates[0]} max={today} value={validDate ? selectedDate : ""} onChange={(event) => {
        const value = event.target.value;
        if (isValidStockDate(value) && value <= today) setSelection(market.id, value);
      }} /><datalist id={`stock-dates-${market.id}`}>{dates.map((date) => <option key={date} value={date} />)}</datalist></label>
      <div className="stock-date-navigation"><button type="button" disabled={!earlierDate} onClick={() => earlierDate && setSelection(market.id, earlierDate)}>{copy.previousDate}</button><button type="button" disabled={!laterDate} onClick={() => laterDate && setSelection(market.id, laterDate)}>{copy.nextDate}</button></div>
    </section>

    {snapshot ? <>
      <section className="stock-market-summary" aria-label={copy.statusLabel}>
        <div><span>{copy.marketLabel}</span><strong>{marketTitle}</strong></div>
        <div><span>{copy.venueLabel}</span><strong>{copy.venues[market.id]}</strong></div>
        <div><span>{copy.referenceDate}</span><strong>{snapshot.asOf}</strong></div>
        <div><span>{copy.latestDate}</span><strong>{latestDate}</strong></div>
      </section>
      <section className="stock-section">
        <div className="stock-section-heading"><div><span className="platform-eyebrow">{copy.statusLabel} · {snapshot.asOf}</span><h2>{copy.title}</h2></div><span>{copy.mockLabel}</span></div>
        <div className="platform-treemap" role="group" aria-label={`${copy.title} · ${marketTitle} · ${snapshot.asOf}`}>
          {snapshot.securities.map((item) => {
            const tone = changeTone(item.changePercent);
            const status = item.changePercent > 0 ? copy.up : item.changePercent < 0 ? copy.down : copy.unchanged;
            const sector = copy.sectors[item.sector] ?? copy.sectorLabel;
            const accessibleName = `${item.symbol} · ${item.name} · ${sector} · ${copy.marketCapLabel}: ${currentMarketCap(item.marketCap)} · ${copy.changeLabel}: ${changeText(item.changePercent)} (${status})`;
            return <article key={item.symbol} className={`platform-stock-tile ${tone}`} style={{ flexBasis: `${Math.max(12, totalMarketCap ? item.marketCap / totalMarketCap * 100 : 12)}%` }} tabIndex={0} aria-label={accessibleName} title={accessibleName}>
              <strong>{item.symbol}</strong><span>{item.name}</span><small>{copy.changeLabel}: {changeText(item.changePercent)} · {status}</small><small>{copy.marketCapLabel}: {currentMarketCap(item.marketCap)}</small>
            </article>;
          })}
        </div>
      </section>
      <section className="stock-section stock-data-details">
        <div className="platform-section-heading"><div><span className="platform-eyebrow">{copy.referenceDate}: {snapshot.asOf}</span><h2>{copy.companyLabel}</h2></div><span>{snapshot.securities.length} · {copy.mockLabel}</span></div>
        <div className="platform-table-scroll"><table className="platform-table"><thead><tr><th>{copy.symbolLabel}</th><th>{copy.companyLabel}</th><th>{copy.sectorLabel}</th><th>{copy.marketCapLabel}</th><th>{copy.changeLabel}</th></tr></thead><tbody>{snapshot.securities.map((item) => <tr key={item.symbol}><th scope="row">{item.symbol}</th><td>{item.name}</td><td>{copy.sectors[item.sector] ?? copy.sectorLabel}</td><td>{currentMarketCap(item.marketCap)}</td><td className={changeTone(item.changePercent)}>{changeText(item.changePercent)}</td></tr>)}</tbody></table></div>
      </section>
      <section className="stock-source-note"><div><strong>{copy.sourceLabel}</strong><p>{copy.sourceDisclosure}</p></div><div><strong>{copy.referenceDate}</strong><p>{snapshot.asOf}</p></div></section>
      <div className="stock-legend" aria-label={copy.changeLabel}><span className="is-up">{copy.up}</span><span className="is-down">{copy.down}</span><span className="is-flat">{copy.unchanged}</span></div>
    </> : <section className="stock-empty-state" role="status"><h2>{invalidMarket || !dates.length ? copy.noMarketSnapshots : copy.noSnapshotTitle}</h2><p>{emptyMessage}</p><p>{copy.mockDisclosure}</p></section>}
  </>;
}

export function StockMarketLoading({ locale }: { locale: Locale }) {
  const copy = stockCopy[locale];
  return <section className="stock-loading"><h1>{copy.title}</h1><p>{copy.intro}</p><p>{copy.mockDisclosure}</p></section>;
}

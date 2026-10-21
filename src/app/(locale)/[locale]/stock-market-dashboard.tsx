"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Locale } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { stockMarkets } from "@/lib/data-platform/registry";
import { snapshotDatesForMarket } from "@/lib/data-platform/published-stocks";
import { stockCopy, weekdayNoSnapshot } from "@/lib/data-platform/stock-copy";
import { stockUnavailableCopy } from "@/lib/data-platform/stock-unavailable-copy";
import { adjacentAvailableDates, classifyStockDate, isValidStockDate } from "@/lib/data-platform/stock-selection";
import { stockIssueCopy } from "@/lib/data-platform/market-issue-copy";
import { DatePicker } from "./date-picker";
import { useSnapshotQueryDate } from "./use-snapshot-query-date";

export function StockMarketDashboard({ locale }: { locale: Locale }) {
  const search = useSearchParams();
  const router = useRouter();
  const platform = platformCopy[locale];
  const copy = stockCopy[locale];
  const rawMarket = search.get("market");
  const rawDate = search.get("date");
  const market = stockMarkets.find((item) => item.id === rawMarket) ?? stockMarkets[0];
  const invalidMarket = rawMarket !== null && market.id !== rawMarket;
  const dates = snapshotDatesForMarket(market.id).sort();
  const { today, selectedDate } = useSnapshotQueryDate(marketTimeZone(market.id), dates);
  const date = rawDate ?? selectedDate;
  const validDate = isValidStockDate(date);
  const dateStatus = invalidMarket ? "empty" : classifyStockDate(dates, date, today);
  const { previous: earlierDate, next: laterDate } = adjacentAvailableDates(dates, date);

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
    <header className="platform-page-heading stock-page-heading"><span className="platform-eyebrow">{platform.categories[2]}</span><h1>{platform.categories[2]}</h1><p>{stockUnavailableCopy[locale]}</p></header>
    <p className="market-issues-shortcut"><Link href={`/${locale}/stocks/issues`}>{stockIssueCopy[locale].title} →</Link></p>

    <section className="stock-controls" aria-label={copy.title}>
      <label className="stock-control"><span>{copy.marketLabel}</span><select value={market.id} onChange={(event) => {
        const nextMarket = stockMarkets.find((item) => item.id === event.target.value);
        if (nextMarket) setSelection(nextMarket.id, rawDate ?? undefined);
      }}>{stockMarkets.map((item) => <option key={item.id} value={item.id}>{copy.marketNames[item.id]}{item.benchmark ? ` · ${item.benchmark}` : ""}</option>)}</select></label>
      <label className="stock-control stock-date-control"><span>{copy.dateLabel}</span><DatePicker locale={locale} label={copy.dateLabel} value={validDate ? date : ""} max={today} onChange={(value) => { if (isValidStockDate(value) && value <= today) setSelection(market.id, value); }} /></label>
      <div className="stock-date-navigation"><button type="button" disabled={!earlierDate} onClick={() => earlierDate && setSelection(market.id, earlierDate)}>{copy.previousDate}</button><button type="button" disabled={!laterDate} onClick={() => laterDate && setSelection(market.id, laterDate)}>{copy.nextDate}</button></div>
    </section>

    <section className="stock-empty-state" role="status"><h2>{invalidMarket || !dates.length ? copy.noMarketSnapshots : copy.noSnapshotTitle}</h2><p>{emptyMessage}</p><p>{copy.sourceDisclosure}</p></section>
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

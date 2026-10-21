"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/site";
import { calculateGoldMove, findPreviousComparableQuote, pricePerGoldUnit, type GoldQuote } from "@/lib/data-platform/gold-market";
import type { GoldCopy, GoldPageSection } from "@/lib/data-platform/gold-copy";

export function GoldQuotePanel({ locale, section, quotes, copy }: { locale: Locale; section: GoldPageSection; quotes: GoldQuote[]; copy: GoldCopy }) {
  const kinds = [...new Set(quotes.map((quote) => quote.priceKind))];
  const [kind, setKind] = useState<GoldQuote["priceKind"]>(kinds[0] ?? "market-reference");
  const [unit, setUnit] = useState<"gram" | "don">("gram");
  const matching = useMemo(() => quotes.filter((quote) => quote.priceKind === kind).sort((a, b) => b.observedAt.localeCompare(a.observedAt)), [quotes, kind]);
  const dates = [...new Set(matching.map((quote) => quote.observedAt))];
  const [selectedDate, setSelectedDate] = useState(dates[0] ?? "");
  const date = dates.includes(selectedDate) ? selectedDate : dates[0] ?? "";
  const current = matching.find((quote) => quote.observedAt === date) ?? null;
  const previous = current ? findPreviousComparableQuote(quotes, current) : null;
  const move = current ? calculateGoldMove(current.price, previous?.price) : null;
  const value = current ? pricePerGoldUnit(current.price, unit) : null;
  const formatter = current && /^[A-Z]{3}$/.test(current.currency)
    ? new Intl.NumberFormat(locale, { style: "currency", currency: current.currency, maximumFractionDigits: 2 })
    : new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const history = current ? matching.filter((quote) => quote.providerId === current.providerId && quote.currency === current.currency && quote.unit === current.unit).slice().sort((a, b) => a.observedAt.localeCompare(b.observedAt)) : [];
  const low = Math.min(...history.map((quote) => quote.price));
  const high = Math.max(...history.map((quote) => quote.price));
  const points = history.map((quote, index) => `${history.length <= 1 ? 50 : index / (history.length - 1) * 100},${high === low ? 50 : 90 - (quote.price - low) / (high - low) * 80}`).join(" ");
  const dateIndex = dates.indexOf(date);
  const stateLabel = move?.direction === "up" ? copy.up : move?.direction === "down" ? copy.down : move ? copy.flat : copy.noQuote;

  return <section className="gold-live-quotes" aria-label={copy.title}>
    <div className="gold-quote-controls">
      <label>{copy.unit}<select value={unit} onChange={(event) => setUnit(event.target.value as "gram" | "don")}><option value="gram">{copy.unitGram}</option><option value="don">{copy.unitDon}</option></select></label>
      <label>{copy.dateLabel}<select value={date} onChange={(event) => setSelectedDate(event.target.value)}>{dates.map((item) => <option key={item} value={item}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${item}T00:00:00Z`))}</option>)}</select></label>
      <div className="gold-date-buttons"><button type="button" disabled={dateIndex < 0 || dateIndex >= dates.length - 1} onClick={() => setSelectedDate(dates[dateIndex + 1] ?? date)}>{copy.previousDay}</button><button type="button" disabled={dateIndex <= 0} onClick={() => setSelectedDate(dates[dateIndex - 1] ?? date)}>{copy.nextDay}</button></div>
      <label>{copy.marketReference}<select value={kind} onChange={(event) => { setKind(event.target.value as GoldQuote["priceKind"]); setSelectedDate(""); }}>{kinds.map((item) => <option key={item} value={item}>{item === "market-reference" ? copy.marketReference : item === "customer-buy" ? copy.customerBuy : copy.customerSell}</option>)}</select></label>
    </div>
    {current && value !== null ? <>
      <div className="gold-current-quote"><span>{current.priceKind === "market-reference" ? copy.marketReference : current.priceKind === "customer-buy" ? copy.customerBuy : copy.customerSell}</span><strong>{formatter.format(value)}</strong><span>{copy.dateLabel}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${current.observedAt}T00:00:00Z`))} · {current.providerName}</span></div>
      <dl className="gold-change-grid"><div><dt>{copy.difference}</dt><dd>{move && previous ? `${formatter.format(pricePerGoldUnit(move.change, unit) ?? move.change)} · ${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${previous.observedAt}T00:00:00Z`))}` : copy.noQuote}</dd></div><div><dt>{copy.changePercent}</dt><dd className={move ? `gold-move-${move.direction}` : "gold-move-unavailable"}>{move ? `${move.changePercent > 0 ? "+" : ""}${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(move.changePercent)}% · ${stateLabel}` : stateLabel}</dd></div></dl>
      {section === "history" && history.length > 1 ? <div className="gold-chart-wrap"><svg viewBox="0 0 100 100" role="img" aria-label={copy.history}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg><table><caption>{copy.history}</caption><thead><tr><th>{copy.dateLabel}</th><th>{copy.title} · {unit === "gram" ? copy.unitGram : copy.unitDon}</th></tr></thead><tbody>{history.map((item) => <tr key={`${item.providerId}-${item.observedAt}`}><th scope="row">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${item.observedAt}T00:00:00Z`))}</th><td>{formatter.format(pricePerGoldUnit(item.price, unit) ?? item.price)}</td></tr>)}</tbody></table></div> : null}
      <p className="platform-data-note">{current.conditions} · {copy.pendingTitle}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(current.fetchedAt))}</p>
    </> : <p className="platform-empty-state">{copy.noQuote}</p>}
  </section>;
}

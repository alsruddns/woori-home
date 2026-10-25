"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/site";
import { companyFactsCopy, companyFactsUnavailableCopy } from "@/lib/data-platform/company-facts-copy";
import { companyFactsPeriodCopy } from "@/lib/data-platform/company-facts-period-copy";
import { companyFactsExtraCopy, companySectorLabel } from "@/lib/data-platform/company-facts-extra-copy";
import { companyFactsStatusCopy } from "@/lib/data-platform/company-facts-status-copy";
import { fetchCompanyFacts } from "@/lib/data-platform/company-facts-fetch.mjs";
import { stockCopy } from "@/lib/data-platform/stock-copy";
import { cryptoCopy } from "@/lib/data-platform/crypto-copy";
import { companySearchAliases, normalizeCompanySearch } from "@/lib/data-platform/company-search-aliases.mjs";
import { CompanyFinancialTreemap } from "./company-financial-treemap";

type Period = "annual" | "quarterly";
type CompanyFactRow = {
  companyId: string; ticker: string; name: string; exchange: string | null; sector: string; sicCode: string | null; industry: string | null; fiscalYear: number | null; fiscalPeriod: string | null;
  startDate: string | null; endDate: string; filedDate: string; form: string; accessionNumber: string; durationDays: number | null;
  revenue: string | null; operatingIncome: string | null; netIncome: string | null; assets: string | null; liabilities: string | null;
  operatingCashFlow: string | null; sourceUrl: string; sourceName: string;
};

function calculateYearOverYearGrowth(rows: CompanyFactRow[], metric: "revenue" | "netIncome") {
  const comparable = rows.filter((row) => row[metric] !== null && row.fiscalYear !== null)
    .slice().sort((left, right) => left.endDate.localeCompare(right.endDate));
  const latest = comparable.at(-1);
  if (!latest || latest[metric] === null || latest.fiscalYear === null) return null;
  const comparison = comparable.find((row) => row.fiscalYear === latest.fiscalYear! - 1 && row.fiscalPeriod === latest.fiscalPeriod);
  if (!comparison || comparison[metric] === null) return null;
  const currentValue = Number(latest[metric]);
  const previousValue = Number(comparison[metric]);
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue <= 0 || currentValue < 0) return null;
  return (currentValue / previousValue - 1) * 100;
}

export function CompanyFundamentalsPanel({ locale }: { locale: Locale }) {
  const copy = companyFactsCopy[locale];
  const periodCopy = companyFactsPeriodCopy[locale];
  const extra = companyFactsExtraCopy[locale];
  const statusCopy = companyFactsStatusCopy[locale];
  const stock = stockCopy[locale];
  const [period, setPeriod] = useState<Period>("annual");
  const [summaryResult, setSummaryResult] = useState<{ period: Period; data: CompanyFactRow[]; asOf: string | null; dataObservedAt: string | null } | null>(null);
  const [summaryErrorPeriod, setSummaryErrorPeriod] = useState<Period | null>(null);
  const [historyResult, setHistoryResult] = useState<{ key: string; data: CompanyFactRow[] } | null>(null);
  const [historyErrorKey, setHistoryErrorKey] = useState("");
  const [selectedTicker, setSelectedTicker] = useState("");
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [sortMetric, setSortMetric] = useState<"revenue" | "operatingIncome" | "netIncome" | "assets">("revenue");
  const summaryState = summaryResult?.period === period ? "ready" : summaryErrorPeriod === period ? "unavailable" : "loading";
  const historyKey = `${period}:${selectedTicker}`;
  const historyState = historyResult?.key === historyKey ? "ready" : historyErrorKey === historyKey ? "unavailable" : "loading";
  const summary = useMemo(() => summaryResult?.period === period ? summaryResult.data : [], [summaryResult, period]);
  const visibleSummary = useMemo(() => summary.filter((row) => {
    const term = normalizeCompanySearch(search.trim());
    const matchesSearch = !term || [row.ticker, row.name, row.industry ?? "", ...companySearchAliases(row.ticker)]
      .some((value) => normalizeCompanySearch(value).includes(term));
    return matchesSearch && (!sectorFilter || row.sector === sectorFilter);
  }).sort((left, right) => {
    const a = left[sortMetric] === null ? null : Number(left[sortMetric]);
    const b = right[sortMetric] === null ? null : Number(right[sortMetric]);
    return a === null ? (b === null ? left.ticker.localeCompare(right.ticker) : 1) : b === null ? -1 : b - a;
  }), [summary, search, sectorFilter, sortMetric]);
  const sectorOptions = [...new Set(summary.map((row) => row.sector))].sort();
  const history = useMemo(() => historyResult?.key === historyKey ? historyResult.data : [], [historyResult, historyKey]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ period, latest: "true", pageSize: "100" });
    fetchCompanyFacts(`/portal-api/finance/companies?${params}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Financial facts unavailable."); return response.json(); })
      .then((payload) => {
        const data = Array.isArray(payload.data) ? payload.data as CompanyFactRow[] : [];
        setSummaryResult({ period, data, asOf: typeof payload.asOf === "string" ? payload.asOf : null, dataObservedAt: typeof payload.dataObservedAt === "string" ? payload.dataObservedAt : null });
        setSelectedTicker((current) => data.some((row) => row.ticker === current) ? current : data[0]?.ticker ?? "");
      })
      .catch(() => { if (!controller.signal.aborted) { setSummaryErrorPeriod(period); setSelectedTicker(""); } });
    return () => controller.abort();
  }, [period]);

  useEffect(() => {
    const controller = new AbortController();
    if (!selectedTicker) return () => controller.abort();
    const params = new URLSearchParams({ period, ticker: selectedTicker, pageSize: "200" });
    fetchCompanyFacts(`/portal-api/finance/companies?${params}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Financial history unavailable."); return response.json(); })
      .then((payload) => { setHistoryResult({ key: historyKey, data: Array.isArray(payload.data) ? payload.data as CompanyFactRow[] : [] }); })
      .catch(() => { if (!controller.signal.aborted) setHistoryErrorKey(historyKey); });
    return () => controller.abort();
  }, [period, selectedTicker, historyKey]);

  const selected = summary.find((row) => row.ticker === selectedTicker) ?? null;
  const trend = useMemo(() => (historyResult?.key === historyKey ? historyResult.data : [])
    .filter((row) => row.revenue !== null && Number.isFinite(Number(row.revenue)))
    .slice().sort((left, right) => left.endDate.localeCompare(right.endDate)), [historyResult, historyKey]);
  const revenueGrowth = useMemo(() => calculateYearOverYearGrowth(history, "revenue"), [history]);
  const netIncomeGrowth = useMemo(() => calculateYearOverYearGrowth(history, "netIncome"), [history]);

  const amount = (value: string | null) => value === null ? "—" : new Intl.NumberFormat(locale, {
    style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1,
  }).format(Number(value));
  const date = (value: string | null) => {
    if (!value) return "—";
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(parsed);
  };
  const dateTime = (value: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(parsed);
  };
  const periodLabel = (row: CompanyFactRow) => `${row.fiscalPeriod ?? row.form}${row.fiscalYear ? ` ${row.fiscalYear}` : ""}`;
  const chartPoints = useMemo(() => {
    if (trend.length < 2) return "";
    const values = trend.map((row) => Number(row.revenue));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values.map((value, index) => `${20 + index * 560 / (values.length - 1)},${150 - (value - min) / span * 125}`).join(" ");
  }, [trend]);

  return <section className="company-fundamentals" aria-labelledby="company-fundamentals-title">
    <header className="company-fundamentals-heading">
      <div><span className="platform-eyebrow">SEC EDGAR</span><h2 id="company-fundamentals-title">{copy.title}</h2><p>{copy.description}</p></div>
      <div className="company-facts-period-switch" role="group" aria-label={copy.period}>
        <button type="button" aria-pressed={period === "annual"} onClick={() => setPeriod("annual")}>{periodCopy.annual} <small>10-K</small></button>
        <button type="button" aria-pressed={period === "quarterly"} onClick={() => setPeriod("quarterly")}>{periodCopy.quarterly} <small>10-Q</small></button>
      </div>
    </header>
    <p className="company-fundamentals-source">{period === "annual" ? periodCopy.annualBasis : periodCopy.quarterlyBasis} {copy.source}{summaryResult?.period === period ? <> {copy.filed}: {date(summaryResult.asOf)} · {statusCopy.factsLoaded}: {dateTime(summaryResult.dataObservedAt)} UTC</> : null}</p>
    <CompanyFinancialTreemap locale={locale} period={period} onPeriodChange={setPeriod} onSelectCompany={(ticker) => {
      setSelectedTicker(ticker);
      document.getElementById("company-fundamentals-detail-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }} />

    {summaryState === "loading" ? <p role="status">{copy.loading}</p> : summaryState === "unavailable" ? <p role="status">{companyFactsUnavailableCopy[locale]}</p> : summary.length === 0 ? <p role="status">{copy.empty}</p> : <>
      <div className="company-facts-controls">
        <label><span>{copy.company}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.company} /></label>
        <label><span>{stock.sectorLabel}</span><select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)}>
          <option value="">{cryptoCopy[locale].all}</option>
          {sectorOptions.map((sector) => <option key={sector} value={sector}>{companySectorLabel(locale, sector, stock.sectors)}</option>)}
        </select></label>
        <label><span>{extra.sortBy}</span><select value={sortMetric} onChange={(event) => setSortMetric(event.target.value as typeof sortMetric)}>
          <option value="revenue">{copy.revenue}</option><option value="operatingIncome">{copy.operatingIncome}</option><option value="netIncome">{copy.netIncome}</option><option value="assets">{copy.assets}</option>
        </select></label>
      </div>
      <div className="company-facts-summary-grid" aria-label={copy.title}>
        {visibleSummary.map((row) => <button key={`${row.companyId}-${row.accessionNumber}-${row.startDate ?? "instant"}`} type="button" className={`company-facts-summary-card${row.ticker === selectedTicker ? " is-selected" : ""}`} aria-pressed={row.ticker === selectedTicker} onClick={() => setSelectedTicker(row.ticker)}>
          <span className="company-facts-company"><strong>{row.ticker}</strong><small>{locale === "ko" ? `${companySearchAliases(row.ticker).find((alias) => /[가-힣]/.test(alias)) ? `${companySearchAliases(row.ticker).find((alias) => /[가-힣]/.test(alias))} · ` : ""}${row.name}` : row.name}</small></span>
          <span className="company-facts-period">{periodLabel(row)} <small>{row.form} · {date(row.startDate)} – {date(row.endDate)}</small></span>
          <span className="company-facts-industry"><small>{companySectorLabel(locale, row.sector, stock.sectors)}</small>{row.industry ? <small>{row.industry}</small> : null}</span>
          <span className="company-facts-metrics">
            <span><small>{copy.revenue}</small><strong>{amount(row.revenue)}</strong></span>
            <span><small>{copy.operatingIncome}</small><strong>{amount(row.operatingIncome)}</strong></span>
            <span><small>{copy.netIncome}</small><strong>{amount(row.netIncome)}</strong></span>
            <span><small>{copy.assets}</small><strong>{amount(row.assets)}</strong></span>
          </span>
          <span className="company-facts-filed">{copy.filed}: {date(row.filedDate)}</span>
        </button>)}
      </div>

      {visibleSummary.length === 0 ? <p role="status">{copy.empty}</p> : null}
      {selected ? <section className="company-facts-detail" aria-labelledby="company-facts-detail-title">
        <header className="company-facts-detail-heading">
          <div><h3 id="company-facts-detail-title">{periodCopy.detail}: {selected.name} ({selected.ticker})</h3><p>{copy.period}: {periodLabel(selected)} · {copy.filed}: {date(selected.filedDate)}</p></div>
          <label><span>{periodCopy.chooseCompany}</span><select value={selectedTicker} onChange={(event) => setSelectedTicker(event.target.value)}>
            {summary.map((row) => <option key={row.ticker} value={row.ticker}>{row.ticker} — {row.name}</option>)}
          </select></label>
        </header>

        {historyState === "loading" ? <p role="status">{copy.loading}</p> : historyState === "unavailable" ? <p role="status">{companyFactsUnavailableCopy[locale]}</p> : <>
          {revenueGrowth !== null ? <p className="company-facts-growth">{extra.growth}: <strong>{new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(revenueGrowth / 100)}</strong></p> : null}
          {netIncomeGrowth !== null ? <p className="company-facts-growth">{statusCopy.netIncomeGrowth}: <strong>{new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(netIncomeGrowth / 100)}</strong></p> : null}
          <div className="company-facts-trend" aria-label={periodCopy.revenueTrend}>
            <h4>{periodCopy.revenueTrend}</h4>
            {trend.length > 1 ? <svg viewBox="0 0 600 180" role="img" aria-label={`${periodCopy.revenueTrend}: ${trend.map((row) => `${periodLabel(row)} ${amount(row.revenue)}`).join(", ")}`} preserveAspectRatio="none">
              <line x1="20" y1="150" x2="580" y2="150" className="company-facts-chart-axis" />
              <polyline points={chartPoints} className="company-facts-chart-line" />
              {trend.map((row, index) => <circle key={`${row.accessionNumber}-${row.endDate}`} cx={20 + index * 560 / (trend.length - 1)} cy={150 - (Number(row.revenue) - Math.min(...trend.map((item) => Number(item.revenue))) ) / (Math.max(...trend.map((item) => Number(item.revenue))) - Math.min(...trend.map((item) => Number(item.revenue))) || 1) * 125} r="3" className="company-facts-chart-point"><title>{periodLabel(row)} · {amount(row.revenue)}</title></circle>)}
            </svg> : <p role="status">{copy.empty}</p>}
          </div>
          <div className="platform-table-scroll company-facts-history-scroll"><table className="platform-table company-facts-history-table"><thead><tr>
            <th>{copy.period}</th><th>{copy.endDate}</th><th>{copy.filed}</th><th>{copy.revenue} (USD)</th><th>{copy.operatingIncome} (USD)</th><th>{copy.netIncome} (USD)</th><th>{copy.assets} (USD)</th><th>{copy.liabilities} (USD)</th><th>{copy.cashFlow} (USD)</th><th>{copy.filing}</th>
          </tr></thead><tbody>{history.map((row) => <tr key={`${row.accessionNumber}-${row.startDate ?? "instant"}-${row.endDate}`}>
            <th scope="row">{periodLabel(row)}<small>{row.startDate ? `${date(row.startDate)} – ${date(row.endDate)} · ${row.durationDays ?? "—"} days` : date(row.endDate)}</small></th>
            <td><time dateTime={row.endDate}>{date(row.endDate)}</time></td><td><time dateTime={row.filedDate}>{date(row.filedDate)}</time></td>
            <td>{amount(row.revenue)}</td><td>{amount(row.operatingIncome)}</td><td>{amount(row.netIncome)}</td><td>{amount(row.assets)}</td><td>{amount(row.liabilities)}</td><td>{amount(row.operatingCashFlow)}</td>
            <td><a href={row.sourceUrl} target="_blank" rel="noreferrer">{copy.filing}</a></td>
          </tr>)}</tbody></table></div>
        </>}
      </section> : null}
    </>}
  </section>;
}

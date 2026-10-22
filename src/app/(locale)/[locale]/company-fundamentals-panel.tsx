"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/site";
import { companyFactsCopy, companyFactsUnavailableCopy } from "@/lib/data-platform/company-facts-copy";
import { companyFactsPeriodCopy } from "@/lib/data-platform/company-facts-period-copy";

type Period = "annual" | "quarterly";
type CompanyFactRow = {
  companyId: string; ticker: string; name: string; exchange: string | null; fiscalYear: number | null; fiscalPeriod: string | null;
  startDate: string | null; endDate: string; filedDate: string; form: string; accessionNumber: string; durationDays: number | null;
  revenue: string | null; operatingIncome: string | null; netIncome: string | null; assets: string | null; liabilities: string | null;
  operatingCashFlow: string | null; sourceUrl: string; sourceName: string;
};

export function CompanyFundamentalsPanel({ locale }: { locale: Locale }) {
  const copy = companyFactsCopy[locale];
  const periodCopy = companyFactsPeriodCopy[locale];
  const [period, setPeriod] = useState<Period>("annual");
  const [summaryResult, setSummaryResult] = useState<{ period: Period; data: CompanyFactRow[] } | null>(null);
  const [summaryErrorPeriod, setSummaryErrorPeriod] = useState<Period | null>(null);
  const [historyResult, setHistoryResult] = useState<{ key: string; data: CompanyFactRow[] } | null>(null);
  const [historyErrorKey, setHistoryErrorKey] = useState("");
  const [selectedTicker, setSelectedTicker] = useState("");
  const summaryState = summaryResult?.period === period ? "ready" : summaryErrorPeriod === period ? "unavailable" : "loading";
  const historyKey = `${period}:${selectedTicker}`;
  const historyState = historyResult?.key === historyKey ? "ready" : historyErrorKey === historyKey ? "unavailable" : "loading";
  const summary = summaryResult?.period === period ? summaryResult.data : [];
  const history = historyResult?.key === historyKey ? historyResult.data : [];

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ period, latest: "true", pageSize: "100" });
    fetch(`/portal-api/finance/companies?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Financial facts unavailable."); return response.json(); })
      .then((payload) => {
        const data = Array.isArray(payload.data) ? payload.data as CompanyFactRow[] : [];
        setSummaryResult({ period, data });
        setSelectedTicker((current) => data.some((row) => row.ticker === current) ? current : data[0]?.ticker ?? "");
      })
      .catch(() => { if (!controller.signal.aborted) { setSummaryErrorPeriod(period); setSelectedTicker(""); } });
    return () => controller.abort();
  }, [period]);

  useEffect(() => {
    const controller = new AbortController();
    if (!selectedTicker) return () => controller.abort();
    const params = new URLSearchParams({ period, ticker: selectedTicker, pageSize: "200" });
    fetch(`/portal-api/finance/companies?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Financial history unavailable."); return response.json(); })
      .then((payload) => { setHistoryResult({ key: historyKey, data: Array.isArray(payload.data) ? payload.data as CompanyFactRow[] : [] }); })
      .catch(() => { if (!controller.signal.aborted) setHistoryErrorKey(historyKey); });
    return () => controller.abort();
  }, [period, selectedTicker, historyKey]);

  const selected = summary.find((row) => row.ticker === selectedTicker) ?? null;
  const trend = useMemo(() => (historyResult?.key === historyKey ? historyResult.data : [])
    .filter((row) => row.revenue !== null && Number.isFinite(Number(row.revenue)))
    .slice().sort((left, right) => left.endDate.localeCompare(right.endDate)), [historyResult, historyKey]);

  const amount = (value: string | null) => value === null ? "—" : new Intl.NumberFormat(locale, {
    style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1,
  }).format(Number(value));
  const date = (value: string | null) => {
    if (!value) return "—";
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(parsed);
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
    <p className="company-fundamentals-source">{period === "annual" ? periodCopy.annualBasis : periodCopy.quarterlyBasis} {copy.source}</p>

    {summaryState === "loading" ? <p role="status">{copy.loading}</p> : summaryState === "unavailable" ? <p role="status">{companyFactsUnavailableCopy[locale]}</p> : summary.length === 0 ? <p role="status">{copy.empty}</p> : <>
      <div className="company-facts-summary-grid" aria-label={copy.title}>
        {summary.map((row) => <button key={`${row.companyId}-${row.accessionNumber}-${row.startDate ?? "instant"}`} type="button" className={`company-facts-summary-card${row.ticker === selectedTicker ? " is-selected" : ""}`} aria-pressed={row.ticker === selectedTicker} onClick={() => setSelectedTicker(row.ticker)}>
          <span className="company-facts-company"><strong>{row.ticker}</strong><small>{row.name}</small></span>
          <span className="company-facts-period">{periodLabel(row)} <small>{row.form} · {date(row.startDate)} – {date(row.endDate)}</small></span>
          <span className="company-facts-metrics">
            <span><small>{copy.revenue}</small><strong>{amount(row.revenue)}</strong></span>
            <span><small>{copy.operatingIncome}</small><strong>{amount(row.operatingIncome)}</strong></span>
            <span><small>{copy.netIncome}</small><strong>{amount(row.netIncome)}</strong></span>
            <span><small>{copy.assets}</small><strong>{amount(row.assets)}</strong></span>
          </span>
          <span className="company-facts-filed">{copy.filed}: {date(row.filedDate)}</span>
        </button>)}
      </div>

      {selected ? <section className="company-facts-detail" aria-labelledby="company-facts-detail-title">
        <header className="company-facts-detail-heading">
          <div><h3 id="company-facts-detail-title">{periodCopy.detail}: {selected.name} ({selected.ticker})</h3><p>{copy.period}: {periodLabel(selected)} · {copy.filed}: {date(selected.filedDate)}</p></div>
          <label><span>{periodCopy.chooseCompany}</span><select value={selectedTicker} onChange={(event) => setSelectedTicker(event.target.value)}>
            {summary.map((row) => <option key={row.ticker} value={row.ticker}>{row.ticker} — {row.name}</option>)}
          </select></label>
        </header>

        {historyState === "loading" ? <p role="status">{copy.loading}</p> : historyState === "unavailable" ? <p role="status">{companyFactsUnavailableCopy[locale]}</p> : <>
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

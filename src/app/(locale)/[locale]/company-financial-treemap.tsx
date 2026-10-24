"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/site";
import { cryptoTreemapLayout } from "@/lib/data-platform/crypto-market.mjs";
import { companyFinancialMetrics, sicDivision } from "@/lib/data-platform/company-financial-treemap.mjs";
import { companyFinancialTreemapCopy } from "@/lib/data-platform/company-financial-treemap-copy";
import { companyFactsCopy } from "@/lib/data-platform/company-facts-copy";
import { companyFactsStatusCopy } from "@/lib/data-platform/company-facts-status-copy";

type Fact = {
  companyId: string; ticker: string; name: string; sector: string; sicCode: string | null; industry: string | null;
  fiscalYear: number | null; fiscalPeriod: string | null; startDate: string | null; endDate: string; filedDate: string;
  durationDays: number | null; revenue: string | null; operatingIncome: string | null; netIncome: string | null; assets: string | null; sourceUrl: string;
};
type Metric = "revenue" | "assets" | "operatingIncome";
type ColorMetric = "revenueGrowth" | "operatingMargin" | "netMargin";
type Response = { data?: Fact[]; asOf?: string | null; dataObservedAt?: string | null; collectionStatus?: { lastSuccessAt?: string | Date | null } };

async function getFacts(query: URLSearchParams, signal: AbortSignal) {
  const response = await fetch(`/portal-api/finance/companies?${query}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error("SEC company facts unavailable");
  return response.json() as Promise<Response>;
}

export function CompanyFinancialTreemap({ locale, onSelectCompany }: { locale: Locale; onSelectCompany: (ticker: string) => void }) {
  const copy = companyFinancialTreemapCopy[locale];
  const factsCopy = companyFactsCopy[locale];
  const statusCopy = companyFactsStatusCopy[locale];
  const [years, setYears] = useState<number[]>([]);
  const [fiscalYear, setFiscalYear] = useState<number | null>(null);
  const [areaMetric, setAreaMetric] = useState<Metric>("revenue");
  const [colorMetric, setColorMetric] = useState<ColorMetric>("revenueGrowth");
  const [data, setData] = useState<Fact[]>([]);
  const [previous, setPrevious] = useState<Fact[]>([]);
  const [sourceState, setSourceState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [sourceAsOf, setSourceAsOf] = useState<string | null>(null);
  const [dataObservedAt, setDataObservedAt] = useState<string | null>(null);
  const [loadedYear, setLoadedYear] = useState<number | null>(null);
  const [lastSuccessAt, setLastSuccessAt] = useState<string | Date | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ period: "annual", pageSize: "200" });
    getFacts(query, controller.signal).then((payload) => {
      const rows = Array.isArray(payload.data) ? payload.data : [];
      const yearsFound = [...new Set(rows.map((row) => row.fiscalYear).filter((year): year is number => Number.isInteger(year)))].sort((a, b) => b - a);
      const companyCoverage = new Map<number, Set<string>>();
      for (const row of rows) {
        if (!Number.isInteger(row.fiscalYear)) continue;
        const companies = companyCoverage.get(row.fiscalYear!) ?? new Set<string>();
        companies.add(row.ticker);
        companyCoverage.set(row.fiscalYear!, companies);
      }
      const defaultYear = [...yearsFound].sort((a, b) => (companyCoverage.get(b)?.size ?? 0) - (companyCoverage.get(a)?.size ?? 0) || b - a)[0] ?? null;
      setYears(yearsFound);
      setFiscalYear((current) => current !== null && yearsFound.includes(current) ? current : defaultYear);
    }).catch(() => { if (!controller.signal.aborted) setSourceState("unavailable"); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (fiscalYear === null) return () => controller.abort();
    const makeQuery = (year: number) => new URLSearchParams({ period: "annual", latest: "true", fiscalYear: String(year), pageSize: "100" });
    Promise.all([getFacts(makeQuery(fiscalYear), controller.signal), getFacts(makeQuery(fiscalYear - 1), controller.signal)])
      .then(([current, prior]) => {
        setData(Array.isArray(current.data) ? current.data : []);
        setPrevious(Array.isArray(prior.data) ? prior.data : []);
        setSourceAsOf(current.asOf ?? null);
        setDataObservedAt(current.dataObservedAt ?? null);
        setLastSuccessAt(current.collectionStatus?.lastSuccessAt ?? null);
        setLoadedYear(fiscalYear);
        setSourceState("ready");
      }).catch(() => { if (!controller.signal.aborted) { setData([]); setPrevious([]); setLoadedYear(fiscalYear); setSourceState("unavailable"); } });
    return () => controller.abort();
  }, [fiscalYear]);

  const rows = useMemo(() => {
    const priorByTicker = new Map(previous.map((row) => [row.ticker, row]));
    return data.map((row) => ({ row, metrics: companyFinancialMetrics(row, priorByTicker.get(row.ticker) ?? null) }));
  }, [data, previous]);
  const rankedRows = useMemo(() => [...rows].sort((left, right) => {
    const a = left.metrics[areaMetric];
    const b = right.metrics[areaMetric];
    return a === null ? (b === null ? left.row.ticker.localeCompare(right.row.ticker) : 1) : b === null ? -1 : b - a;
  }), [rows, areaMetric]);
  const groups = useMemo(() => {
    const grouped = new Map<string, typeof rows>();
    for (const entry of rows) {
      const division = sicDivision(entry.row.sicCode);
      const key = entry.row.sicCode ? `${division.key}:${entry.row.sicCode}` : "unclassified";
      grouped.set(key, [...(grouped.get(key) ?? []), entry]);
    }
    return [...grouped].map(([key, entries]) => ({
      key,
      label: entries[0]?.row.industry?.trim() || (entries[0]?.row.sicCode ? `SIC ${entries[0].row.sicCode}` : copy.sector),
      division: sicDivision(entries[0]?.row.sicCode),
      entries,
    }));
  }, [rows, copy.sector]);

  const colorValues = rows.map(({ metrics }) => metrics[colorMetric]).filter((value): value is number => value !== null && Number.isFinite(value));
  const colorMin = Math.min(0, ...colorValues);
  const colorMax = Math.max(0, ...colorValues);
  const groupedTiles = groups.map((group) => {
    const eligible = group.entries.filter(({ metrics }) => {
      const value = metrics[areaMetric];
      return value !== null && value > 0;
    });
    const candidates = eligible.map(({ row, metrics }) => ({ id: row.ticker, symbol: row.ticker, name: row.name, currency: "USD", close: 1, marketCap: metrics[areaMetric] as number }));
    return { group, eligible, candidates, groupValue: candidates.reduce((sum, entry) => sum + entry.marketCap, 0), rects: cryptoTreemapLayout(candidates) };
  }).filter(({ groupValue, rects }) => groupValue > 0 && rects !== null);
  const groupRects = cryptoTreemapLayout(groupedTiles.map(({ group, groupValue }) => ({ id: group.key, symbol: group.key, name: group.label, currency: "USD", close: 1, marketCap: groupValue })));
  const totalMissing = rows.filter(({ metrics }) => metrics[areaMetric] === null).length;
  const netLosses = rows.filter(({ metrics }) => metrics.netIncome !== null && metrics.netIncome < 0).length;
  const amount = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(locale, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
  const percent = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(locale, { style: "percent", signDisplay: "always", maximumFractionDigits: 1 }).format(value / 100);
  const areaLabel = areaMetric === "revenue" ? copy.revenue : areaMetric === "assets" ? copy.assets : copy.operatingIncome;
  const colorLabel = colorMetric === "revenueGrowth" ? copy.revenueGrowth : colorMetric === "operatingMargin" ? copy.operatingMargin : copy.netMargin;
  const displayState = fiscalYear !== null && loadedYear !== fiscalYear ? "loading" : sourceState;

  return <section className="company-financial-treemap" aria-labelledby="company-financial-treemap-title">
    <header><div><span className="platform-eyebrow">SEC EDGAR · SIC</span><h3 id="company-financial-treemap-title">{copy.title}</h3><p>{copy.description}</p></div></header>
    <div className="company-financial-treemap-controls">
      <label><span>{copy.year}</span><select value={fiscalYear ?? ""} onChange={(event) => setFiscalYear(Number(event.target.value))} disabled={!years.length}>
        {years.map((year) => <option key={year} value={year}>{year}</option>)}
      </select></label>
      <label><span>{copy.area}</span><select value={areaMetric} onChange={(event) => setAreaMetric(event.target.value as Metric)}>
        <option value="revenue">{copy.revenue}</option><option value="assets">{copy.assets}</option><option value="operatingIncome">{copy.operatingIncome}</option>
      </select></label>
      <label><span>{copy.color}</span><select value={colorMetric} onChange={(event) => setColorMetric(event.target.value as ColorMetric)}>
        <option value="revenueGrowth">{copy.revenueGrowth}</option><option value="operatingMargin">{copy.operatingMargin}</option><option value="netMargin">{copy.netMargin}</option>
      </select></label>
    </div>
    {displayState === "loading" ? <p role="status">{copy.year}: {fiscalYear ?? "…"}</p> : displayState === "unavailable" ? <p role="status">{copy.noData}</p> : <>
      <p className="company-financial-treemap-meta">{copy.year}: {fiscalYear} · {copy.area}: {areaLabel} · {copy.color}: {colorLabel} · {copy.companies}: {rows.length} / 100 · {copy.losses}: {netLosses} · {copy.missing}: {totalMissing}</p>
      {sourceAsOf ? <p className="company-financial-treemap-meta">{factsCopy.filed}: {sourceAsOf}{dataObservedAt ? ` · ${statusCopy.factsLoaded}: ${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(dataObservedAt))} UTC` : ""}</p> : null}
      <p className="company-financial-treemap-meta">{statusCopy.lastSecSuccess}: {lastSuccessAt ? `${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(lastSuccessAt))} UTC` : "—"}</p>
      {groupedTiles.length ? <div className="company-financial-treemap-map" role="group" aria-label={`${copy.year} ${fiscalYear}, ${areaLabel}, ${colorLabel}`}>
        {groupedTiles.map(({ group, eligible, rects }) => {
          const groupRect = groupRects?.[group.key];
          if (!groupRect || !rects) return null;
          return <section key={group.key} className="company-financial-treemap-group" style={{ left: `${groupRect.x}%`, top: `${groupRect.y}%`, width: `${groupRect.width}%`, height: `${groupRect.height}%` }} aria-label={`${group.label}, ${group.entries.length} ${copy.companies}`}>
            <h4 title={`${group.label} · ${group.division.key}`}>{group.label}</h4>
            {eligible.map(({ row, metrics }) => {
              const rect = rects[row.ticker];
              if (!rect) return null;
              const metricValue = metrics[colorMetric];
              const maxAbs = Math.max(Math.abs(colorMin), Math.abs(colorMax), 1);
              const alpha = metricValue === null ? 0.12 : 0.14 + Math.min(1, Math.abs(metricValue) / maxAbs) * 0.4;
              const tileStyle = { left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%`, backgroundColor: metricValue === null ? "rgba(120,130,140,.16)" : `rgba(58,105,137,${alpha})` };
              const detail = `${row.name} (${row.ticker}) · ${areaLabel}: ${amount(metrics[areaMetric])} · ${colorLabel}: ${percent(metricValue)} · ${row.fiscalPeriod} ${row.fiscalYear} · ${row.endDate} · filed ${row.filedDate}`;
              return <button key={row.ticker} type="button" className={`company-financial-treemap-tile${metrics.netIncome !== null && metrics.netIncome < 0 ? " is-loss" : ""}`} style={tileStyle} title={`${detail} · ${copy.detail}`} aria-label={detail} onClick={() => onSelectCompany(row.ticker)}>
                <strong>{row.ticker}</strong><span>{amount(metrics[areaMetric])}</span><small>{percent(metricValue)}</small>
              </button>;
            })}
          </section>;
        })}
      </div> : <p role="status">{copy.noData}</p>}
      <div className="company-financial-treemap-legend"><span>{copy.source}</span><span>{copy.losses}: {netLosses}</span><span>{copy.missing}: {totalMissing}</span></div>
      <div className="company-financial-treemap-table platform-table-scroll"><table className="platform-table"><thead><tr><th>{copy.sector}</th><th>{copy.revenue}</th><th>{factsCopy.netIncome}</th><th>{copy.assets}</th><th>{copy.operatingIncome}</th><th>{copy.operatingMargin}</th><th>{copy.netMargin}</th><th>{copy.revenueGrowth}</th></tr></thead><tbody>
        {rankedRows.map(({ row, metrics }) => <tr key={row.ticker}><th scope="row"><button type="button" className="company-financial-treemap-link" onClick={() => onSelectCompany(row.ticker)}>{row.ticker}</button><small>{row.industry || (row.sicCode ? `SIC ${row.sicCode}` : copy.sector)}</small></th><td>{amount(metrics.revenue)}</td><td>{amount(metrics.netIncome)}</td><td>{amount(metrics.assets)}</td><td>{amount(metrics.operatingIncome)}</td><td>{percent(metrics.operatingMargin)}</td><td>{percent(metrics.netMargin)}</td><td>{percent(metrics.revenueGrowth)}</td></tr>)}
      </tbody></table></div>
      <p className="company-financial-treemap-meta">{copy.year}: {fiscalYear} · {factsCopy.filed}: {sourceAsOf ?? "—"}</p>
    </>}
  </section>;
}

"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Locale } from "@/lib/site";
import { cryptoTreemapLayout } from "@/lib/data-platform/crypto-market.mjs";
import { companyFinancialMetrics, sicIndustryGroup } from "@/lib/data-platform/company-financial-treemap.mjs";
import { companyFinancialTreemapCopy } from "@/lib/data-platform/company-financial-treemap-copy";
import { companyFinancialTreemapControlsCopy } from "@/lib/data-platform/company-financial-treemap-controls-copy";
import { companyFinancialIndustryCopy } from "@/lib/data-platform/company-financial-industry-copy";
import { companyFinancialHeatmapNotes, companyFinancialIndustryGroups, type CompanyIndustryGroupKey } from "@/lib/data-platform/company-financial-industry-groups";
import { companyFinancialIndustryScrollHint } from "@/lib/data-platform/company-financial-industry-scroll-hint";
import { fetchCompanyFacts } from "@/lib/data-platform/company-facts-fetch.mjs";
import { companyFactsCopy } from "@/lib/data-platform/company-facts-copy";
import { companyFactsPeriodCopy } from "@/lib/data-platform/company-facts-period-copy";
import { companyFactsStatusCopy } from "@/lib/data-platform/company-facts-status-copy";
import { marketDetailCopy } from "@/lib/data-platform/market-detail-copy";

type Fact = {
  companyId: string; ticker: string; name: string; sector: string; sicCode: string | null; industry: string | null;
  fiscalYear: number | null; fiscalPeriod: string | null; startDate: string | null; endDate: string; filedDate: string;
  durationDays: number | null; revenue: string | null; operatingIncome: string | null; netIncome: string | null; assets: string | null; sourceUrl: string;
};
type Metric = "revenue" | "assets" | "operatingIncome";
type ColorMetric = "revenueGrowth" | "operatingMargin" | "netMargin";
type Response = { data?: Fact[]; asOf?: string | null; dataObservedAt?: string | null; collectionStatus?: { lastSuccessAt?: string | Date | null } };
type PositionedRect = { x: number; y: number; width: number; height: number };
type Entry = { row: Fact; metrics: ReturnType<typeof companyFinancialMetrics> };
type IndustryGroup = { key: CompanyIndustryGroupKey; label: string; entries: Entry[] };

async function getFacts(query: URLSearchParams, signal: AbortSignal) {
  const response = await fetchCompanyFacts(`/portal-api/finance/companies?${query}`, { signal });
  if (!response.ok) throw new Error("SEC company facts unavailable");
  return response.json() as Promise<Response>;
}

function useIndustryScroll(resetKey: string) {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState({ width: 0, hasOverflow: false });
  const viewportNode = useRef<HTMLDivElement | null>(null);
  const viewportRef = useCallback((node: HTMLDivElement | null) => {
    viewportNode.current = node;
    setViewport(node);
  }, []);
  const contentRef = useCallback((node: HTMLDivElement | null) => setContent(node), []);

  useEffect(() => {
    if (!viewport || !content) return;
    const update = () => {
      const width = content.getBoundingClientRect().width;
      const hasOverflow = viewport.scrollHeight > viewport.clientHeight + 1;
      setLayout((current) => current.width === width && current.hasOverflow === hasOverflow ? current : { width, hasOverflow });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    observer.observe(content);
    return () => observer.disconnect();
  }, [viewport, content]);

  useEffect(() => {
    if (viewportNode.current) viewportNode.current.scrollTop = 0;
  }, [viewport, resetKey]);

  return { viewportRef, contentRef, ...layout };
}

function tileSizeClass(width: number, height: number) {
  if (width >= 112 && height >= 56) return "is-large";
  if (width >= 68 && height >= 38) return "is-medium";
  if (width >= 35 && height >= 24) return "is-small";
  return "is-tiny";
}

function IndustryHeatmapCard({ locale, group, areaMetric, colorMetric, colorLabel, areaLabel, maxAbs, copy, activeTicker, onSelect, formatAmount, formatPercent }: {
  locale: Locale;
  group: IndustryGroup;
  areaMetric: Metric;
  colorMetric: ColorMetric;
  colorLabel: string;
  areaLabel: string;
  maxAbs: number;
  copy: typeof companyFinancialTreemapCopy["en"];
  activeTicker: string | null;
  onSelect: (ticker: string) => void;
  formatAmount: (value: number | null) => string;
  formatPercent: (value: number | null) => string;
}) {
  const scrollResetKey = `${areaMetric}:${colorMetric}:${group.entries.map(({ row }) => `${row.ticker}:${row.endDate}`).join("|")}`;
  const { viewportRef, contentRef, width: scrollWidth, hasOverflow } = useIndustryScroll(scrollResetKey);
  const headingId = `company-industry-${group.key}-${useId()}`;
  const mapWidth = Math.max(1, scrollWidth);
  const eligible = group.entries.filter(({ metrics }) => {
    const value = metrics[areaMetric];
    return value !== null && value > 0;
  });
  const unscaled = group.entries.filter((entry) => !eligible.includes(entry));
  const candidates = eligible.map(({ row, metrics }) => ({ id: row.ticker, symbol: row.ticker, name: row.name, currency: "USD", close: 1, marketCap: metrics[areaMetric] as number }));
  const areaTotal = eligible.reduce((sum, entry) => sum + (entry.metrics[areaMetric] ?? 0), 0);
  const mapHeight = Math.max(220, Math.min(440, Math.ceil(Math.sqrt(Math.max(1, eligible.length))) * 76));
  const rects = cryptoTreemapLayout(candidates, { width: mapWidth, height: mapHeight }) as Record<string, PositionedRect> | null;
  const useReadableGrid = Boolean(rects && Object.values(rects).some((rect) => rect.width < 48 || rect.height < 28));

  const colorFor = (metricValue: number | null) => {
    const intensity = metricValue === null ? 0 : Math.min(1, Math.abs(metricValue) / maxAbs);
    if (metricValue === null) return { colorClass: "is-missing", backgroundColor: "rgba(115,126,139,.2)" };
    if (Math.abs(metricValue) < 0.05) return { colorClass: "is-neutral", backgroundColor: `rgba(125,139,151,${0.2 + intensity * 0.28})` };
    return metricValue > 0
      ? { colorClass: "is-positive", backgroundColor: `rgba(35,145,101,${0.2 + intensity * 0.42})` }
      : { colorClass: "is-negative", backgroundColor: `rgba(194,66,76,${0.2 + intensity * 0.42})` };
  };
  const detailFor = ({ row, metrics }: Entry) => `${row.name} (${row.ticker}) · ${row.industry || row.sector || copy.sector} · ${areaLabel}: ${formatAmount(metrics[areaMetric])} · ${colorLabel}: ${formatPercent(metrics[colorMetric])} · ${row.fiscalPeriod} ${row.fiscalYear} · ${row.endDate} · filed ${row.filedDate}`;

  return <article className="company-financial-industry-card" aria-label={`${group.label}, ${group.entries.length} ${copy.companies}`}>
    <header className="company-financial-industry-card-header">
      <div><h4 id={headingId}>{group.label}</h4><p>{group.entries.length} {copy.companies}</p></div>
      <div className="company-financial-industry-card-header-meta">
        <small>{areaLabel}: {formatAmount(areaTotal)}</small>
        {hasOverflow ? <span className="company-financial-industry-scroll-hint"><span aria-hidden="true">↕</span> {companyFinancialIndustryScrollHint[locale]}</span> : null}
      </div>
    </header>
    <div ref={viewportRef} className="company-financial-industry-scroll" tabIndex={hasOverflow ? 0 : undefined} role={hasOverflow ? "region" : undefined} aria-labelledby={hasOverflow ? headingId : undefined}>
    <div ref={contentRef} className="company-financial-industry-scroll-content">
    {useReadableGrid ? <>
      <p className="company-financial-industry-layout-note">{companyFinancialHeatmapNotes[locale].equalTiles}</p>
      <div className="company-financial-industry-readable-grid">
        {eligible.map((entry) => {
          const { colorClass, backgroundColor } = colorFor(entry.metrics[colorMetric]);
          return <button key={entry.row.ticker} type="button" className={`company-financial-industry-readable-tile ${colorClass}${activeTicker === entry.row.ticker ? " is-selected" : ""}`} style={{ backgroundColor }} title={detailFor(entry)} aria-label={detailFor(entry)} aria-pressed={activeTicker === entry.row.ticker} onClick={() => onSelect(entry.row.ticker)}>
            <strong>{entry.row.ticker}</strong><span>{formatAmount(entry.metrics[areaMetric])}</span><small>{formatPercent(entry.metrics[colorMetric])}</small>
          </button>;
        })}
      </div>
    </> : <div className="company-financial-industry-map" role="group" aria-label={`${group.label}: ${areaLabel}, ${colorLabel}`} style={{ height: mapHeight }}>
      {eligible.map((entry) => {
        const rect = rects?.[entry.row.ticker];
        if (!rect) return null;
        const { colorClass, backgroundColor } = colorFor(entry.metrics[colorMetric]);
        const sizeClass = tileSizeClass(rect.width, rect.height);
        const style: CSSProperties = { left: `${rect.x / mapWidth * 100}%`, top: `${rect.y / mapHeight * 100}%`, width: `${rect.width / mapWidth * 100}%`, height: `${rect.height / mapHeight * 100}%`, backgroundColor };
        return <button key={entry.row.ticker} type="button" className={`company-financial-treemap-tile ${sizeClass} ${colorClass}${entry.metrics.netIncome !== null && entry.metrics.netIncome < 0 ? " is-loss" : ""}${activeTicker === entry.row.ticker ? " is-selected" : ""}`} style={style} title={detailFor(entry)} aria-label={detailFor(entry)} aria-pressed={activeTicker === entry.row.ticker} onClick={() => onSelect(entry.row.ticker)}>
          <strong>{entry.row.ticker}</strong>
          {sizeClass === "is-large" ? <><span>{formatAmount(entry.metrics[areaMetric])}</span><small>{formatPercent(entry.metrics[colorMetric])}</small></> : null}
          {sizeClass === "is-medium" ? <small>{formatPercent(entry.metrics[colorMetric])}</small> : null}
        </button>;
      })}
    </div>}
    {unscaled.length ? <div className="company-financial-industry-unscaled">
      <p>{companyFinancialHeatmapNotes[locale].unscaled}</p>
      <ul>{unscaled.map((entry) => <li key={entry.row.ticker}><button type="button" className={activeTicker === entry.row.ticker ? "is-selected" : ""} aria-pressed={activeTicker === entry.row.ticker} title={detailFor(entry)} aria-label={detailFor(entry)} onClick={() => onSelect(entry.row.ticker)}><strong>{entry.row.ticker}</strong><span>{formatAmount(entry.metrics[areaMetric])}</span></button></li>)}</ul>
    </div> : null}
    </div>
    </div>
  </article>;
}

export function CompanyFinancialTreemap({ locale, period, onPeriodChange, onSelectCompany }: { locale: Locale; period: "annual" | "quarterly"; onPeriodChange: (period: "annual" | "quarterly") => void; onSelectCompany: (ticker: string) => void }) {
  const copy = companyFinancialTreemapCopy[locale];
  const ui = companyFinancialTreemapControlsCopy[locale];
  const industryCopy = companyFinancialIndustryCopy[locale];
  const factsCopy = companyFactsCopy[locale];
  const periodCopy = companyFactsPeriodCopy[locale];
  const statusCopy = companyFactsStatusCopy[locale];
  const [years, setYears] = useState<number[]>([]);
  const [fiscalYear, setFiscalYear] = useState<number | null>(null);
  const [areaMetric, setAreaMetric] = useState<Metric>("revenue");
  const [colorMetric, setColorMetric] = useState<ColorMetric>("revenueGrowth");
  const [data, setData] = useState<Fact[]>([]);
  const [previous, setPrevious] = useState<Fact[]>([]);
  const [sourceState, setSourceState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [fetchAttempt, setFetchAttempt] = useState(0);
  const [sourceAsOf, setSourceAsOf] = useState<string | null>(null);
  const [dataObservedAt, setDataObservedAt] = useState<string | null>(null);
  const [loadedYear, setLoadedYear] = useState<number | null>(null);
  const [loadedPeriod, setLoadedPeriod] = useState<"annual" | "quarterly" | null>(null);
  const [lastSuccessAt, setLastSuccessAt] = useState<string | Date | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomedIndustry, setZoomedIndustry] = useState<{ key: string; label: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
  const dialogScrollYRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ period, pageSize: "200" });
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
  }, [period, fetchAttempt]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isExpanded && !dialog.open) dialog.showModal();
    if (!isExpanded && dialog.open) dialog.close();
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      window.scrollTo(0, dialogScrollYRef.current);
    };
  }, [isExpanded]);

  useEffect(() => {
    const controller = new AbortController();
    if (fiscalYear === null) return () => controller.abort();
    const makeQuery = (year: number) => new URLSearchParams({ period, latest: "true", fiscalYear: String(year), pageSize: "100" });
    Promise.all([getFacts(makeQuery(fiscalYear), controller.signal), getFacts(makeQuery(fiscalYear - 1), controller.signal)])
      .then(([current, prior]) => {
        setData(Array.isArray(current.data) ? current.data : []);
        setPrevious(Array.isArray(prior.data) ? prior.data : []);
        setSourceAsOf(current.asOf ?? null);
        setDataObservedAt(current.dataObservedAt ?? null);
        setLastSuccessAt(current.collectionStatus?.lastSuccessAt ?? null);
        setLoadedYear(fiscalYear);
        setLoadedPeriod(period);
        setSourceState("ready");
      }).catch(() => { if (!controller.signal.aborted) { setData([]); setPrevious([]); setLoadedYear(fiscalYear); setLoadedPeriod(period); setSourceState("unavailable"); } });
    return () => controller.abort();
  }, [fiscalYear, period, fetchAttempt]);

  const rows = useMemo(() => {
    const priorByPeriod = new Map(previous.map((row) => [`${row.ticker}:${period === "quarterly" ? row.fiscalPeriod : "FY"}`, row]));
    return data.map((row) => ({ row, metrics: companyFinancialMetrics(row, priorByPeriod.get(`${row.ticker}:${period === "quarterly" ? row.fiscalPeriod : "FY"}`) ?? null) }));
  }, [data, previous, period]);
  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase(locale);
    if (!query) return rows;
    return rows.filter(({ row }) => `${row.ticker} ${row.name}`.toLocaleLowerCase(locale).includes(query));
  }, [rows, searchQuery, locale]);
  const groups = useMemo(() => {
    const grouped = new Map<CompanyIndustryGroupKey, Entry[]>();
    for (const entry of filteredRows) {
      const key = sicIndustryGroup(entry.row.sicCode) as CompanyIndustryGroupKey;
      grouped.set(key, [...(grouped.get(key) ?? []), entry]);
    }
    return [...grouped].map(([key, entries]) => ({
      key,
      label: companyFinancialIndustryGroups[locale][key],
      entries,
    })).sort((a, b) => Object.keys(companyFinancialIndustryGroups[locale]).indexOf(a.key) - Object.keys(companyFinancialIndustryGroups[locale]).indexOf(b.key));
  }, [filteredRows, locale]);
  const filteredRankedRows = useMemo(() => [...filteredRows].sort((left, right) => {
    const a = left.metrics[areaMetric];
    const b = right.metrics[areaMetric];
    return a === null ? (b === null ? left.row.ticker.localeCompare(right.row.ticker) : 1) : b === null ? -1 : b - a;
  }), [filteredRows, areaMetric]);

  const colorValues = rows.map(({ metrics }) => metrics[colorMetric]).filter((value): value is number => value !== null && Number.isFinite(value));
  const maxAbs = Math.max(...colorValues.map(Math.abs), 1);
  const renderableGroups = groups;
  const totalMissing = filteredRows.filter(({ metrics }) => metrics[areaMetric] === null).length;
  const netLosses = filteredRows.filter(({ metrics }) => metrics.netIncome !== null && metrics.netIncome < 0).length;
  const amount = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(locale, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
  const percent = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(locale, { style: "percent", signDisplay: "always", maximumFractionDigits: 1 }).format(value / 100);
  const areaLabel = areaMetric === "revenue" ? copy.revenue : areaMetric === "assets" ? copy.assets : copy.operatingIncome;
  const colorLabel = colorMetric === "revenueGrowth" ? copy.revenueGrowth : colorMetric === "operatingMargin" ? copy.operatingMargin : copy.netMargin;
  const displayState = fiscalYear !== null && (loadedYear !== fiscalYear || loadedPeriod !== period) ? "loading" : sourceState;
  const activeEntry = rows.find(({ row }) => row.ticker === activeTicker) ?? null;

  const formatAmount = (value: number | null) => amount(value);
  const formatPercent = (value: number | null) => percent(value);

  const renderControls = (idPrefix: string) => <div className="company-financial-treemap-controls">
    <div className="company-facts-period-switch" role="group" aria-label={factsCopy.period}>
      <button type="button" aria-pressed={period === "annual"} onClick={() => onPeriodChange("annual")}>{periodCopy.annual} <small>10-K</small></button>
      <button type="button" aria-pressed={period === "quarterly"} onClick={() => onPeriodChange("quarterly")}>{periodCopy.quarterly} <small>10-Q</small></button>
    </div>
    <label><span>{copy.year}</span><select value={fiscalYear ?? ""} onChange={(event) => setFiscalYear(Number(event.target.value))} disabled={!years.length} aria-label={copy.year}>
      {years.map((year) => <option key={year} value={year}>{year}</option>)}
    </select></label>
    <label><span>{copy.area}</span><select value={areaMetric} onChange={(event) => setAreaMetric(event.target.value as Metric)} aria-label={copy.area}>
      <option value="revenue">{copy.revenue}</option><option value="assets">{copy.assets}</option><option value="operatingIncome">{copy.operatingIncome}</option>
    </select></label>
    <label><span>{copy.color}</span><select value={colorMetric} onChange={(event) => setColorMetric(event.target.value as ColorMetric)} aria-label={copy.color}>
      <option value="revenueGrowth">{copy.revenueGrowth}</option><option value="operatingMargin">{copy.operatingMargin}</option><option value="netMargin">{copy.netMargin}</option>
    </select></label>
    {idPrefix === "expanded" ? <label className="company-financial-treemap-industry-control"><span>{industryCopy.industry}</span><select value={zoomedIndustry?.key ?? ""} onChange={(event) => {
      const group = groups.find((candidate) => candidate.key === event.target.value);
      setZoomedIndustry(group ? { key: group.key, label: group.label } : null);
    }} aria-label={industryCopy.zoomIndustry}>
      <option value="">{industryCopy.allIndustries}</option>
      {zoomedIndustry && !groups.some((group) => group.key === zoomedIndustry.key) ? <option value={zoomedIndustry.key}>{zoomedIndustry.label}</option> : null}
      {groups.map((group) => <option key={group.key} value={group.key}>{group.label} ({group.entries.length})</option>)}
    </select></label> : null}
    <label className="company-financial-treemap-search"><span>{ui.search}</span><input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={ui.searchPlaceholder} aria-label={ui.search} />
    </label>
    {idPrefix === "normal" ? <button ref={fullscreenButtonRef} type="button" className="company-financial-treemap-expand" onClick={() => { dialogScrollYRef.current = window.scrollY; setIsExpanded(true); }} aria-haspopup="dialog">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" /></svg>
      <span>{ui.fullscreen}</span>
    </button> : null}
  </div>;

  const renderLegend = () => <div className="company-financial-treemap-legend" aria-label={ui.legend}>
    <span className="company-financial-treemap-legend-title">{ui.legend}: {colorLabel}</span>
    <span><i className="is-positive" aria-hidden="true" />{ui.positive}</span>
    <span><i className="is-negative" aria-hidden="true" />{ui.negative}</span>
    <span><i className="is-neutral" aria-hidden="true" />{ui.neutral}</span>
    <span><i className="is-missing" aria-hidden="true" />{ui.unavailable}</span>
    <span className="company-financial-treemap-legend-explainer">{ui.colorExplanation}</span>
  </div>;

  const renderSelectedDetail = () => activeEntry ? <aside className="company-financial-treemap-selected" aria-live="polite">
    <div><strong>{activeEntry.row.ticker}</strong><span>{activeEntry.row.name}</span><small>{activeEntry.row.industry || activeEntry.row.sector || copy.sector} · {areaLabel}: {amount(activeEntry.metrics[areaMetric])} · {colorLabel}: {percent(activeEntry.metrics[colorMetric])} · {copy.year}: {activeEntry.row.fiscalYear ?? "—"}</small></div>
    <button type="button" onClick={() => { setIsExpanded(false); onSelectCompany(activeEntry.row.ticker); }}>{copy.detail}</button>
  </aside> : null;

  const renderIndustryGrid = (dialog = false) => {
    const visibleGroups = dialog && zoomedIndustry ? renderableGroups.filter((group) => group.key === zoomedIndustry.key) : renderableGroups;
    return <div className="company-financial-industry-grid" role="list" aria-label={`${copy.year} ${fiscalYear}, ${areaLabel}, ${colorLabel}`}>
      {visibleGroups.map((group) => <IndustryHeatmapCard key={group.key} locale={locale} group={group} areaMetric={areaMetric} colorMetric={colorMetric} colorLabel={colorLabel} areaLabel={areaLabel} maxAbs={maxAbs} copy={copy} activeTicker={activeTicker} onSelect={(ticker) => { setActiveTicker(ticker); if (dialogRef.current?.open) setIsExpanded(false); onSelectCompany(ticker); }} formatAmount={formatAmount} formatPercent={formatPercent} />)}
    </div>;
  };

  const renderStatus = () => <>
    <p className="company-financial-treemap-meta">{period === "annual" ? periodCopy.annual : periodCopy.quarterly} · {copy.year}: {fiscalYear} · {copy.area}: {areaLabel} · {copy.color}: {colorLabel} · {copy.companies}: {filteredRows.length} / {rows.length} · {copy.losses}: {netLosses} · {copy.missing}: {totalMissing}</p>
    <p className="company-financial-treemap-meta">{companyFinancialHeatmapNotes[locale].proportional}</p>
    {sourceAsOf ? <p className="company-financial-treemap-meta">{factsCopy.filed}: {sourceAsOf}{dataObservedAt ? ` · ${statusCopy.factsLoaded}: ${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(dataObservedAt))} UTC` : ""}</p> : null}
    <p className="company-financial-treemap-meta">{statusCopy.lastSecSuccess}: {lastSuccessAt ? `${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(lastSuccessAt))} UTC` : "—"}</p>
  </>;

  return <>
    <section className="company-financial-treemap" aria-labelledby="company-financial-treemap-title">
      <header><div><span className="platform-eyebrow">SEC EDGAR · SIC</span><h3 id="company-financial-treemap-title">{copy.title}</h3><p>{copy.description}</p></div></header>
      {renderControls("normal")}
      {displayState === "loading" ? <p role="status">{copy.year}: {fiscalYear ?? "—"}</p> : displayState === "unavailable" ? <p role="alert">{copy.noData} <button type="button" onClick={() => setFetchAttempt((attempt) => attempt + 1)}>{marketDetailCopy[locale].retry}</button></p> : <>
        {renderStatus()}
        {renderableGroups.length ? renderIndustryGrid() : <p role="status">{filteredRows.length === 0 && searchQuery.trim() ? ui.noMatches : copy.noData}</p>}
        {renderSelectedDetail()}
        {renderLegend()}
        <div className="company-financial-treemap-table platform-table-scroll"><table className="platform-table"><thead><tr><th>{copy.sector}</th><th>{copy.revenue}</th><th>{factsCopy.netIncome}</th><th>{copy.assets}</th><th>{copy.operatingIncome}</th><th>{copy.operatingMargin}</th><th>{copy.netMargin}</th><th>{copy.revenueGrowth}</th></tr></thead><tbody>
          {filteredRankedRows.map(({ row, metrics }) => <tr key={row.ticker}><th scope="row"><button type="button" className="company-financial-treemap-link" onClick={() => { setActiveTicker(row.ticker); onSelectCompany(row.ticker); }}>{row.ticker}</button><small>{row.industry || (row.sicCode ? `SIC ${row.sicCode}` : copy.sector)}</small></th><td>{amount(metrics.revenue)}</td><td>{amount(metrics.netIncome)}</td><td>{amount(metrics.assets)}</td><td>{amount(metrics.operatingIncome)}</td><td>{percent(metrics.operatingMargin)}</td><td>{percent(metrics.netMargin)}</td><td>{percent(metrics.revenueGrowth)}</td></tr>)}
        </tbody></table></div>
        <p className="company-financial-treemap-meta">{copy.year}: {fiscalYear} · {factsCopy.filed}: {sourceAsOf ?? "—"}</p>
      </>}
    </section>
    <dialog ref={dialogRef} className="company-financial-treemap-dialog" role="dialog" aria-modal="true" aria-labelledby="company-financial-treemap-dialog-title"
      onKeyDownCapture={(event) => { if (event.key === "Escape") { event.preventDefault(); setIsExpanded(false); } }}
      onCancel={(event) => { event.preventDefault(); setIsExpanded(false); }}
      onClose={() => { setIsExpanded(false); requestAnimationFrame(() => { window.scrollTo(0, dialogScrollYRef.current); fullscreenButtonRef.current?.focus({ preventScroll: true }); }); }}>
      <div className="company-financial-treemap-dialog-inner">
        <div className="company-financial-treemap-dialog-sticky">
          <header className="company-financial-treemap-dialog-header">
            <div><span className="platform-eyebrow">SEC EDGAR · SIC</span><h2 id="company-financial-treemap-dialog-title">{copy.title} — {ui.fullscreen}</h2><p>{copy.description}</p></div>
            <button type="button" className="company-financial-treemap-close" onClick={() => setIsExpanded(false)} aria-label={ui.close} autoFocus>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m18 6-12 12M6 6l12 12" /></svg><span>{ui.close}</span>
            </button>
          </header>
          {renderControls("expanded")}
        </div>
        {displayState === "ready" ? <>
          {renderStatus()}
          {zoomedIndustry ? <nav className="company-financial-treemap-industry-breadcrumb" aria-label={industryCopy.industry}>
            <button type="button" onClick={() => setZoomedIndustry(null)}>{industryCopy.allIndustries}</button>
            <span aria-hidden="true">/</span><strong>{zoomedIndustry.label}</strong>
            <span>{groups.find((group) => group.key === zoomedIndustry.key)?.entries.length ?? 0} {copy.companies}</span>
            <button type="button" className="company-financial-treemap-back" onClick={() => setZoomedIndustry(null)}>{industryCopy.backToIndustries}</button>
          </nav> : null}
          {renderableGroups.length && (!zoomedIndustry || renderableGroups.some((group) => group.key === zoomedIndustry.key))
            ? renderIndustryGrid(true)
            : <p role="status">{zoomedIndustry ? industryCopy.emptyIndustry : filteredRows.length === 0 && searchQuery.trim() ? ui.noMatches : copy.noData}</p>}
          {renderSelectedDetail()}
          {renderLegend()}
        </> : displayState === "loading" ? <p role="status">{copy.year}: {fiscalYear ?? "—"}</p> : <p role="alert">{copy.noData} <button type="button" onClick={() => setFetchAttempt((attempt) => attempt + 1)}>{marketDetailCopy[locale].retry}</button></p>}
      </div>
    </dialog>
  </>;
}

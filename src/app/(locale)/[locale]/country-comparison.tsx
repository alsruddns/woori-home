"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/site";
import { indicators } from "@/lib/data-platform/registry";
import { supportedCountries, countryName } from "@/lib/data-platform/countries";
import { countryCopy } from "@/lib/data-platform/country-copy";
import { unitFor } from "@/lib/data-platform/country-units";
import { platformCopy } from "@/lib/data-platform/locales";
import Link from "next/link";
import { CountryTrendChart, type CountrySeries } from "./country-charts";
import { periodChange } from "@/lib/data-platform/rankings";
import { comparePeriodCopy, isRateIndicator } from "@/lib/data-platform/compare-period-copy";
import { countrySearchPlaceholder } from "@/lib/data-platform/world-economy-copy";

type SourceInfo = { provider: string; providerUrl: string; license: string; licenseUrl: string };

export function CountryComparisonDashboard({ locale, initialCountries, initialSeries, initialIndicatorId = "population", dataSource = "json", initialSourceInfo = null }: { locale: Locale; initialCountries: string[]; initialSeries: CountrySeries[]; initialIndicatorId?: string; dataSource?: "json" | "db"; initialSourceInfo?: SourceInfo | null }) {
  const router = useRouter();
  const copy = countryCopy[locale];
  const platform = platformCopy[locale];
  const requestId = useRef(0);
  const [countries, setCountries] = useState(initialCountries);
  const [draftCountries, setDraftCountries] = useState(initialCountries);
  const [indicatorId, setIndicatorId] = useState(initialIndicatorId);
  const [draftIndicator, setDraftIndicator] = useState(initialIndicatorId);
  const [series, setSeries] = useState(initialSeries);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(initialSourceInfo);
  const [startYear, setStartYear] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(null);
  const indicator = indicators.find((item) => item.id === indicatorId)!;
  const availableIndicators = indicators;
  const hasChanges = indicatorId !== draftIndicator || countries.join(",") !== draftCountries.join(",");

  function toggleCountry(code: string) {
    setDraftCountries((current) => current.includes(code)
      ? current.length > 2 ? current.filter((item) => item !== code) : current
      : current.length < 20 ? [...current, code] : current);
  }

  async function compare() {
    if (draftCountries.length < 2 || draftCountries.length > 20) return;
    const id = ++requestId.current;
    setError(false);
    setBusy(true);
    try {
      const query = new URLSearchParams({ countries: draftCountries.join(","), indicator: draftIndicator });
      const response = await fetch(`/portal-api/world-bank/compare?${query}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Comparison request failed");
      const result = await response.json() as { series: CountrySeries[]; sourceInfo?: SourceInfo | null };
      if (id === requestId.current) {
        setSeries(result.series);
        setSourceInfo(result.sourceInfo ?? null);
        setCountries(draftCountries);
        setIndicatorId(draftIndicator);
        const query = new URLSearchParams({ countries: draftCountries.join(","), indicator: draftIndicator });
        router.push(`${window.location.pathname}?${query.toString()}`, { scroll: false });
      }
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  const sortedCountries = [...supportedCountries].sort((a, b) => countryName(a.code, locale).localeCompare(countryName(b.code, locale), locale));
  const visibleCountries = sortedCountries.filter((country) => countryName(country.code, locale).toLocaleLowerCase(locale).includes(countryQuery.trim().toLocaleLowerCase(locale)) || country.code.includes(countryQuery.trim().toLowerCase()));
  const latest = series.map((item) => ({ code: item.code, observation: item.observations.at(-1) ?? null }));
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: indicator.id === "population" || indicator.id === "gdp" ? 0 : 2 });
  const yearSets = series.map((item) => new Set(item.observations.map((row) => row.year)));
  const commonYears = yearSets.length ? [...yearSets[0]].filter((year) => yearSets.every((years) => years.has(year))).sort((a, b) => a - b) : [];
  const availableYears = commonYears.length ? commonYears : [...new Set(series.flatMap((item) => item.observations.map((row) => row.year)))].sort((a, b) => a - b);
  const fromYear = availableYears.includes(startYear ?? -1) ? startYear! : availableYears[0];
  const toYear = availableYears.includes(endYear ?? -1) ? endYear! : availableYears.at(-1);
  const periodCopy = comparePeriodCopy[locale];
  const pointUnit = isRateIndicator(indicator.id) ? comparePeriodCopy[locale].percentagePointUnit : unitFor(locale, indicator);
  const periodRows = series.map((item) => {
    const start = item.observations.find((row) => row.year === fromYear);
    const end = item.observations.find((row) => row.year === toYear);
    return { code: item.code, start: start?.value, end: end?.value, change: periodChange(start?.value, end?.value) };
  });

  function chooseStartYear(value: number) {
    setStartYear(value);
    if (toYear !== undefined && value > toYear) setEndYear(value);
  }

  function chooseEndYear(value: number) {
    setEndYear(value);
    if (fromYear !== undefined && value < fromYear) setStartYear(value);
  }

  return <section className="country-comparison-dashboard" aria-busy={busy}>
    <div className="country-comparison-controls">
      <div className="country-control-group"><label htmlFor="comparison-indicator">{copy.metric}</label><select id="comparison-indicator" value={draftIndicator} onChange={(event) => setDraftIndicator(event.target.value)}>{availableIndicators.map((item) => <option key={item.id} value={item.id}>{item.label[locale] ?? item.label.en}</option>)}</select></div>
      <details className="country-picker"><summary>{copy.chooseCountries} · {draftCountries.length}/20</summary><div className="country-picker-panel"><p>{copy.maxCountries.replace(/5/g, "20")}</p><input className="country-picker-search" type="search" value={countryQuery} onChange={(event) => setCountryQuery(event.target.value)} placeholder={countrySearchPlaceholder(locale)} aria-label={countrySearchPlaceholder(locale)}/>{visibleCountries.map((country) => <label key={country.code}><input type="checkbox" checked={draftCountries.includes(country.code)} disabled={!draftCountries.includes(country.code) && draftCountries.length >= 20 || draftCountries.includes(country.code) && draftCountries.length <= 2} onChange={() => toggleCountry(country.code)}/><span suppressHydrationWarning>{countryName(country.code, locale)}</span></label>)}</div></details>
      <button className="country-compare-button" type="button" disabled={!hasChanges || draftCountries.length < 2} onClick={compare}>{copy.compareCountries}</button>
      {error ? <p className="country-comparison-error" role="alert">{copy.loadError}</p> : null}
    </div>
    {availableYears.length > 0 ? <section className="country-period-analysis"><div className="country-comparison-heading"><div><span className="platform-eyebrow">{indicator.code} · {unitFor(locale, indicator)}</span><h2>{periodCopy.range}</h2></div></div><div className="country-period-controls"><label>{periodCopy.from}<select value={fromYear ?? ""} onChange={(event) => chooseStartYear(Number(event.target.value))}>{availableYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label><label>{periodCopy.to}<select value={toYear ?? ""} onChange={(event) => chooseEndYear(Number(event.target.value))}>{availableYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div><div className="platform-table-scroll"><table className="platform-table"><thead><tr><th>{platform.country}</th><th>{periodCopy.startValue} · {fromYear}</th><th>{periodCopy.endValue} · {toYear}</th><th>{isRateIndicator(indicator.id) ? periodCopy.percentagePoints : periodCopy.difference} ({pointUnit})</th><th>{periodCopy.percent}</th></tr></thead><tbody>{periodRows.map((row) => <tr key={row.code}><th scope="row">{countryName(row.code, locale)}</th><td>{row.start == null ? "—" : number.format(row.start)}</td><td>{row.end == null ? "—" : number.format(row.end)}</td><td>{row.change == null ? "—" : number.format(row.change.absolute)}</td><td>{row.change?.percent == null ? "—" : `${number.format(row.change.percent)}%`}</td></tr>)}</tbody></table></div></section> : null}
    <div className="country-comparison-heading"><div><span className="platform-eyebrow">{indicator.code} · {unitFor(locale, indicator)}</span><h2>{indicator.label[locale] ?? indicator.label.en}</h2></div><span>{copy.latestByCountry}</span></div>
    <div className="country-comparison-chart"><CountryTrendChart locale={locale} title={indicator.label[locale] ?? indicator.label.en} unit={unitFor(locale, indicator)} series={series}/></div>
    <section className="platform-table-section country-latest-table"><div className="platform-section-heading"><h2>{copy.latestByCountry}</h2><span>{platform.referenceYear}</span></div><div className="platform-table-scroll"><table className="platform-table"><thead><tr><th>{platform.country}</th><th>{platform.referenceYear}</th><th>{platform.value} · {unitFor(locale, indicator)}</th></tr></thead><tbody>{latest.map(({ code, observation }) => <tr key={code}><th scope="row">{observation ? <Link href={`/${locale}/countries/${code}`}>{countryName(code, locale)}</Link> : countryName(code, locale)}</th><td>{observation?.year ?? "—"}</td><td>{observation ? number.format(observation.value) : "—"}</td></tr>)}</tbody></table>{latest.every((item) => !item.observation) ? <p className="platform-empty-row">{copy.noObservations}</p> : null}</div></section>
    <p className="platform-data-note">{copy.dataGapNote}</p>
    {dataSource === "db" && sourceInfo ? <p className="platform-data-note"><a href={sourceInfo.providerUrl} rel="noreferrer">{sourceInfo.provider}</a> · <a href={sourceInfo.licenseUrl} rel="noreferrer">{sourceInfo.license}</a></p> : null}
  </section>;
}

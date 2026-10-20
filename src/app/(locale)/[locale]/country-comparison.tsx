"use client";

import { useRef, useState } from "react";
import type { Locale } from "@/lib/site";
import { indicators } from "@/lib/data-platform/registry";
import { supportedCountries, countryName } from "@/lib/data-platform/countries";
import { countryCopy } from "@/lib/data-platform/country-copy";
import { unitFor } from "@/lib/data-platform/country-units";
import { platformCopy } from "@/lib/data-platform/locales";
import Link from "next/link";
import { CountryTrendChart, type CountrySeries } from "./country-charts";

export function CountryComparisonDashboard({ locale, initialCountries, initialSeries }: { locale: Locale; initialCountries: string[]; initialSeries: CountrySeries[] }) {
  const copy = countryCopy[locale];
  const platform = platformCopy[locale];
  const requestId = useRef(0);
  const [countries, setCountries] = useState(initialCountries);
  const [draftCountries, setDraftCountries] = useState(initialCountries);
  const [indicatorId, setIndicatorId] = useState("population");
  const [draftIndicator, setDraftIndicator] = useState("population");
  const [series, setSeries] = useState(initialSeries);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const indicator = indicators.find((item) => item.id === indicatorId)!;
  const hasChanges = indicatorId !== draftIndicator || countries.join(",") !== draftCountries.join(",");

  function toggleCountry(code: string) {
    setDraftCountries((current) => current.includes(code)
      ? current.length > 2 ? current.filter((item) => item !== code) : current
      : current.length < 5 ? [...current, code] : current);
  }

  async function compare() {
    if (draftCountries.length < 2 || draftCountries.length > 5) return;
    const id = ++requestId.current;
    setError(false);
    setBusy(true);
    try {
      const query = new URLSearchParams({ countries: draftCountries.join(","), indicator: draftIndicator });
      const response = await fetch(`/api/data-compare?${query}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Comparison request failed");
      const result = await response.json() as { series: CountrySeries[] };
      if (id === requestId.current) {
        setSeries(result.series);
        setCountries(draftCountries);
        setIndicatorId(draftIndicator);
      }
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  const sortedCountries = [...supportedCountries].sort((a, b) => countryName(a.code, locale).localeCompare(countryName(b.code, locale), locale));
  const latest = series.map((item) => ({ code: item.code, observation: item.observations.at(-1) ?? null }));
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: indicator.id === "population" || indicator.id === "gdp" ? 0 : 2 });

  return <section className="country-comparison-dashboard" aria-busy={busy}>
    <div className="country-comparison-controls">
      <div className="country-control-group"><label htmlFor="comparison-indicator">{copy.metric}</label><select id="comparison-indicator" value={draftIndicator} onChange={(event) => setDraftIndicator(event.target.value)}>{indicators.map((item) => <option key={item.id} value={item.id}>{item.label[locale] ?? item.label.en}</option>)}</select></div>
      <details className="country-picker"><summary>{copy.chooseCountries} · {draftCountries.length}/5</summary><div className="country-picker-panel"><p>{copy.maxCountries}</p>{sortedCountries.map((country) => <label key={country.code}><input type="checkbox" checked={draftCountries.includes(country.code)} disabled={!draftCountries.includes(country.code) && draftCountries.length >= 5 || draftCountries.includes(country.code) && draftCountries.length <= 2} onChange={() => toggleCountry(country.code)}/><span>{countryName(country.code, locale)}</span></label>)}</div></details>
      <button className="country-compare-button" type="button" disabled={!hasChanges || draftCountries.length < 2} onClick={compare}>{copy.compareCountries}</button>
      {error ? <p className="country-comparison-error" role="alert">{copy.loadError}</p> : null}
    </div>
    <div className="country-comparison-heading"><div><span className="platform-eyebrow">{indicator.code} · {unitFor(locale, indicator)}</span><h2>{indicator.label[locale] ?? indicator.label.en}</h2></div><span>{copy.latestByCountry}</span></div>
    <div className="country-comparison-chart"><CountryTrendChart locale={locale} title={indicator.label[locale] ?? indicator.label.en} unit={unitFor(locale, indicator)} series={series}/></div>
    <section className="platform-table-section country-latest-table"><div className="platform-section-heading"><h2>{copy.latestByCountry}</h2><span>{platform.referenceYear}</span></div><div className="platform-table-scroll"><table className="platform-table"><thead><tr><th>{platform.country}</th><th>{platform.referenceYear}</th><th>{platform.value} · {unitFor(locale, indicator)}</th></tr></thead><tbody>{latest.map(({ code, observation }) => <tr key={code}><th scope="row"><Link href={`/${locale}/countries/${code}`}>{countryName(code, locale)}</Link></th><td>{observation?.year ?? "—"}</td><td>{observation ? number.format(observation.value) : "—"}</td></tr>)}</tbody></table>{latest.every((item) => !item.observation) ? <p className="platform-empty-row">{copy.noObservations}</p> : null}</div></section>
    <p className="platform-data-note">{copy.dataGapNote}</p>
  </section>;
}

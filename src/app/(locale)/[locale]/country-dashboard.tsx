import Link from "next/link";
import type { Locale } from "@/lib/site";
import { indicators } from "@/lib/data-platform/registry";
import { countryByCode, countryName } from "@/lib/data-platform/countries";
import { countryCopy } from "@/lib/data-platform/country-copy";
import { unitFor } from "@/lib/data-platform/country-units";
import { platformCopy } from "@/lib/data-platform/locales";
import { getSnapshotMetadata, latestForCountry, observationsFor } from "@/lib/data-platform/snapshot";
import { CountryTrendChart } from "./country-charts";

const trendIds = ["population", "gdp", "fertility", "life-expectancy"] as const;
const coreIds = new Set(["population", "gdp", "gdp-per-capita", "fertility", "life-expectancy", "population-growth"]);

function number(value: number, locale: Locale, indicatorId: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: indicatorId === "population" || indicatorId === "gdp" ? 0 : 2 }).format(value);
}

export function CountryDashboard({ locale, countryCode }: { locale: Locale; countryCode: string }) {
  const country = countryByCode(countryCode);
  if (!country) return null;
  const comparisonCountry = country.code === "us" ? "kr" : "us";
  const copy = countryCopy[locale];
  const platform = platformCopy[locale];
  const name = countryName(country.code, locale);
  const snapshot = getSnapshotMetadata();
  const latestPopulation = latestForCountry("SP.POP.TOTL", country.iso3);
  const latestRows = indicators.map((indicator) => ({ indicator, observation: latestForCountry(indicator.code, country.iso3) }));
  const extraGroups = (["economy", "population", "energy"] as const).map((category) => ({ category, rows: latestRows.filter(({ indicator }) => indicator.category === category && !coreIds.has(indicator.id)) })).filter(({ rows }) => rows.length > 0);
  const trends = trendIds.map((id) => ({ indicator: indicators.find((item) => item.id === id)!, series: observationsFor(indicators.find((item) => item.id === id)!.code, country.iso3).map(({ year, value, unit }) => ({ year, value, unit })) }));
  const allYears = indicators.flatMap((indicator) => observationsFor(indicator.code, country.iso3).map((row) => row.year));
  const updated = latestRows.map((row) => row.observation?.lastCheckedAt).filter(Boolean).sort().at(-1) ?? snapshot.generatedAt;
  const schema = { "@context": "https://schema.org", "@type": "Dataset", name: `${name} · ${copy.dashboard}`, description: copy.intro, creator: { "@type": "Organization", name: "World Bank" }, temporalCoverage: allYears.length ? `${Math.min(...allYears)}/${Math.max(...allYears)}` : undefined, spatialCoverage: { "@type": "Place", name }, variableMeasured: latestRows.map(({ indicator }) => indicator.label[locale]), license: "https://data.worldbank.org/summary-terms-of-use" };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}/world`}>{platform.categories[0]}</Link><span>/</span><Link href={`/${locale}/countries`}>{platform.categories[5]}</Link><span>/</span><span>{name}</span></nav>
    <header className="platform-page-heading country-page-heading"><span className="platform-eyebrow">WORLD BANK / {country.iso3}</span><h1>{name}</h1><p>{copy.intro}</p></header>
    <section className="platform-summary country-meta"><div><span>{copy.selectedCountry}</span><strong>{name} · {country.iso3}</strong></div><div><span>{platform.referenceYear}</span><strong>{latestPopulation?.year ?? platform.missing}</strong></div><div><span>{platform.dataSource}</span><strong>World Development Indicators</strong></div><div><span>{copy.updatedOn}</span><strong>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(updated))}</strong></div></section>
    <section className="platform-indicator-section"><div className="platform-section-heading"><div><span className="platform-eyebrow">{country.iso3} / WDI</span><h2>{platform.indicators}</h2></div><Link href={`/${locale}/countries?countries=${country.code},${comparisonCountry}`}>{copy.compareCountries} →</Link></div>
      <div className="platform-indicator-grid country-kpis">{latestRows.filter(({ indicator }) => coreIds.has(indicator.id)).map(({ indicator, observation }) => <article className="platform-indicator-card" key={indicator.id}><span className="platform-card-label">{indicator.label[locale] ?? indicator.label.en}</span><strong>{observation ? number(observation.value, locale, indicator.id) : platform.missing}</strong><span className="platform-card-meta">{observation ? `${observation.year} · ${unitFor(locale, indicator)}` : copy.noObservations}</span><span className="platform-card-link">{copy.updatedOn}: {observation ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(observation.lastCheckedAt)) : "—"}</span></article>)}</div>
      {extraGroups.map(({ category, rows }) => <details className="country-indicator-group" key={category}><summary>{platform.categories[category === "economy" ? 1 : category === "population" ? 3 : 4]} · {rows.length}</summary><div className="platform-indicator-grid country-kpis">{rows.map(({ indicator, observation }) => <article className="platform-indicator-card" key={indicator.id}><span className="platform-card-label">{indicator.label[locale]}</span><strong>{observation ? number(observation.value, locale, indicator.id) : platform.missing}</strong><span className="platform-card-meta">{observation ? `${observation.year} · ${unitFor(locale, indicator)}` : copy.noObservations}</span></article>)}</div></details>)}
    </section>
    <section className="platform-indicator-section country-trends"><div className="platform-section-heading"><div><span className="platform-eyebrow">{country.iso3} / {copy.series}</span><h2>{copy.trends}</h2></div></div><div className="country-trend-grid">{trends.map(({ indicator, series }) => <article className="country-trend-card" key={indicator.id}><div className="country-trend-heading"><h3>{indicator.label[locale] ?? indicator.label.en}</h3><span>{unitFor(locale, indicator)}</span></div><CountryTrendChart locale={locale} title={indicator.label[locale] ?? indicator.label.en} unit={unitFor(locale, indicator)} series={[{ code: country.code, iso3: country.iso3, observations: series }]} /></article>)}</div></section>
    <section className="platform-explainer"><article><h2>{platform.dataSource}</h2><p>{copy.sourceNote}</p></article><article><h2>{copy.compareCountries}</h2><p>{copy.dataGapNote}</p><Link href={`/${locale}/countries?countries=${country.code},${comparisonCountry}`}>{copy.compareCountries} →</Link></article></section>
  </>;
}

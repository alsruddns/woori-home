import Link from "next/link";
import { origin, type Locale } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { indicators } from "@/lib/data-platform/registry";
import { getSnapshotMetadata, latestByCountry, latestForCountry, observationsFor } from "@/lib/data-platform/snapshot";
import { countryByCode, countryCodeForIso3, countryName } from "@/lib/data-platform/countries";
import { unitFor } from "@/lib/data-platform/country-units";
import { CountryComparisonDashboard } from "./country-comparison";
import type { CountrySeries } from "./country-charts";
import { energyAccessCopy, energyPageCopy } from "@/lib/data-platform/energy-copy";
import { rankCountryObservations } from "@/lib/data-platform/rankings";
import { rankingCopy } from "@/lib/data-platform/ranking-copy";
import { RankingControls } from "./ranking-controls";
import { compareWorldBankCountries, getReviewedWorldBankSourceInfo } from "@/lib/db/world-bank-repository";
import { resolveWorldBankDataSource, worldBankIndicatorSource } from "../../../lib/db/world-bank-mode.mjs";
import { createIndicatorDatasetDescription, validateDatasetSchema } from "@/lib/data-platform/dataset-schema.mjs";

function format(value: number, locale: Locale, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

function localizedCountryName(code: string, fallback: string, locale: Locale) {
  const countryCode = countryCodeForIso3(code);
  return countryCode ? countryName(countryCode, locale) : fallback;
}
function indicatorPath(locale: Locale, id: string) {
  const indicator = indicators.find((item) => item.id === id);
  return `/${locale}/${indicator?.category ?? "world"}/${id}`;
}

export function WorldOverview({ locale, requestedIndicator, requestedYear, requestedDirection }: { locale: Locale; requestedIndicator?: string; requestedYear?: string; requestedDirection?: string }) {
  const copy = platformCopy[locale];
  const ranking = rankingCopy[locale];
  const meta = getSnapshotMetadata();
  const count = latestByCountry("SP.POP.TOTL").filter((item) => item.country !== "WLD").length;
  const rankable = indicators.filter((item) => latestByCountry(item.code).some((row) => row.country !== "WLD"));
  const selectedIndicator = rankable.find((item) => item.code === requestedIndicator) ?? rankable[0];
  const yearRows = selectedIndicator ? observationsFor(selectedIndicator.code).filter((row) => row.country !== "WLD") : [];
  const years = [...new Set(yearRows.map((row) => row.year))].sort((a, b) => b - a);
  const year = years.includes(Number(requestedYear)) ? Number(requestedYear) : years[0];
  const direction = requestedDirection === "asc" ? "asc" : "desc";
  const ranked = selectedIndicator && year ? rankCountryObservations(yearRows, year, direction) : [];
  const structuredData = { "@context": "https://schema.org", "@type": "WebPage", name: copy.overview, description: copy.description, url: `${origin}/${locale}/world`, inLanguage: locale };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}`}>woori.today</Link><span>/</span><span>{copy.categories[0]}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">{copy.dataSource} · World Bank</span><h1>{copy.overview}</h1><p>{copy.overviewBody}</p></header>
    <section className="platform-summary" aria-label={copy.dataSource}><div><span>{copy.dataSource}</span><strong>World Development Indicators</strong></div><div><span>{copy.referenceYear}</span><strong>{new Intl.DateTimeFormat(locale).format(new Date(meta.generatedAt))}</strong></div><div><span>{copy.country}</span><strong>{format(count, locale, 0)}</strong></div></section>
    <section className="platform-indicator-section"><div className="platform-section-heading"><div><span className="platform-eyebrow">WORLD BANK · WDI</span><h2>{copy.indicators}</h2></div><Link href={`/${locale}/countries`}>{copy.compare} →</Link></div>
      <div className="platform-indicator-grid">{indicators.map((indicator) => {
        const latest = latestForCountry(indicator.code, "WLD") ?? latestByCountry(indicator.code)[0] ?? null;
        const label = indicator.label[locale] ?? indicator.label.en;
        return <Link className="platform-indicator-card" href={indicatorPath(locale, indicator.id)} key={indicator.id}>
          <span className="platform-card-label">{label}</span><strong>{latest ? format(latest.value, locale, indicator.id === "population" || indicator.id === "gdp" ? 0 : 2) : copy.missing}</strong>
          <span className="platform-card-meta">{latest ? `${localizedCountryName(latest.country, latest.countryName, locale)} · ${latest.year}` : copy.notAvailable}</span><span className="platform-card-link">{copy.latest} →</span>
        </Link>;
      })}</div>
    </section>
    <section className="platform-table-section"><div className="platform-section-heading"><div><span className="platform-eyebrow">SP.POP.TOTL</span><h2>{copy.compare}: {platformCopy[locale].categories[3]}</h2></div><span>{copy.referenceYear} · {copy.latest}</span></div><DataTable locale={locale} indicator="SP.POP.TOTL" /></section>
    <section className="platform-table-section"><div className="platform-section-heading"><div><span className="platform-eyebrow">{ranking.included}: {count}</span><h2>{ranking.title}</h2></div><span>{ranking.scope}</span></div>
      {selectedIndicator && year ? <RankingControls locale={locale} indicators={rankable} years={years} selectedIndicator={selectedIndicator.code} selectedYear={year} selectedDirection={direction} /> : null}
      {ranked.length ? <div className="platform-table-scroll"><table className="platform-table"><thead><tr><th>{ranking.rank}</th><th>{ranking.country}</th><th>{ranking.year}</th><th>{ranking.value} ({selectedIndicator ? unitFor(locale, selectedIndicator) : ""})</th></tr></thead><tbody>{ranked.map((row) => { const code = countryCodeForIso3(row.country); return <tr key={row.country}><td>{row.rank}</td><th scope="row">{code && countryByCode(code) ? <Link href={`/${locale}/countries/${code}`}>{localizedCountryName(row.country, row.countryName, locale)}</Link> : localizedCountryName(row.country, row.countryName, locale)}</th><td>{row.year}</td><td>{format(row.value, locale, 2)}</td></tr>; })}</tbody></table></div> : <p className="platform-empty-row">{ranking.noData}</p>}
      <p className="platform-data-note">{ranking.included}: {ranked.length} · {ranking.missing}: {Math.max(count - ranked.length, 0)}. Tied values share the same rank; missing values are omitted.</p>
    </section>
    <p className="platform-data-note">{copy.sourceNote} <a href="https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json">World Bank API</a></p>
  </>;
}

export function IndicatorPage({ locale, slug }: { locale: Locale; slug: string }) {
  const indicator = indicators.find((item) => item.id === slug);
  if (!indicator) return null;
  const copy = platformCopy[locale];
  const rows = latestByCountry(indicator.code);
  const reference = latestForCountry(indicator.code, "WLD") ?? rows[0] ?? null;
  const series = reference ? observationsFor(indicator.code, reference.country).sort((a, b) => a.year - b.year) : [];
  const label = indicator.label[locale] ?? indicator.label.en;
  const definition = indicator.definition[locale] ?? copy.sourceNote;
  const interpretation = indicator.interpretation[locale] ?? copy.sourceNote;
  const url = `${origin}/${locale}/${indicator.category}/${indicator.id}`;
  const years = observationsFor(indicator.code).map((row) => row.year);
  const period = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "";
  const structuredData = validateDatasetSchema({ "@context": "https://schema.org", "@type": "Dataset", name: label, description: createIndicatorDatasetDescription({ definition, interpretation, source: copy.sourceNote, label, code: indicator.code, periodLabel: copy.referenceYear, period }), url, creator: { "@type": "Organization", name: "World Bank", url: "https://www.worldbank.org/" }, temporalCoverage: reference ? `${Math.min(...years)}/${Math.max(...years)}` : undefined, variableMeasured: label, license: indicator.id === "electricity-access" ? "https://creativecommons.org/licenses/by/4.0/" : "https://data.worldbank.org/summary-terms-of-use", distribution: { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `https://api.worldbank.org/v2/country/all/indicator/${indicator.code}?format=json` } });
  const prior = reference ? series.filter((item) => item.year < reference.year).at(-1) : undefined;
  const delta = prior && reference ? (reference.value - prior.value) / Math.abs(prior.value) * 100 : null;
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}/world`}>{copy.categories[0]}</Link><span>/</span><span>{label}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">WORLD BANK / {indicator.code}</span><h1>{label}</h1><p>{definition}</p></header>
    <section className="platform-metric-summary"><div><span>{copy.latest}</span><strong>{reference ? format(reference.value, locale, 2) : copy.missing}</strong><small>{reference ? `${localizedCountryName(reference.country, reference.countryName, locale)} · ${reference.year} · ${unitFor(locale, indicator)}` : copy.notAvailable}</small></div><div><span>{copy.previousChange}</span><strong>{delta === null ? copy.missing : `${delta > 0 ? "+" : ""}${format(delta, locale, 2)}%`}</strong><small>{prior && reference ? `${prior.year} → ${reference.year}` : "—"}</small></div><div><span>{copy.updated}</span><strong>{reference?.lastCheckedAt.slice(0, 10) ?? copy.missing}</strong><small>{copy.dataSource}: {reference?.source ?? "World Bank"}</small></div></section>
    <section className="platform-chart-section"><div className="platform-section-heading"><div><span className="platform-eyebrow">{reference?.countryName ?? "World"}</span><h2>{copy.latest}</h2></div><span>{copy.referenceYear}: {reference?.year ?? "—"}</span></div><TrendChart locale={locale} values={series.map((item) => item.value)} label={`${label}, ${reference?.countryName ?? ""}`} /></section>
    <section className="platform-table-section"><div className="platform-section-heading"><div><span className="platform-eyebrow">{indicator.code}</span><h2>{copy.compare}</h2></div></div><DataTable locale={locale} indicator={indicator.code} /></section>
    <section className="platform-explainer"><article><h2>{copy.definition}</h2><p>{definition}</p></article><article><h2>{copy.interpretation}</h2><p>{interpretation}</p></article><article><h2>{copy.dataSource}</h2><p>{copy.sourceNote} <a href={`https://api.worldbank.org/v2/country/all/indicator/${indicator.code}?format=json`}>World Bank · {indicator.code}</a>{reference?.dataProvider ? ` · ${reference.dataProvider}` : ""}</p><small>{reference?.license}</small></article></section>
  </>;
}

export function IndicatorCategory({ locale, category, title }: { locale: Locale; category: "economy" | "population" | "energy"; title: string }) {
  const copy = platformCopy[locale];
  const entries = indicators.filter((item) => item.category === category);
  const energy = category === "energy" ? energyPageCopy[locale] : null;
  const pageUrl = `${origin}/${locale}/${category}`;
  const structuredData = { "@context": "https://schema.org", "@type": "CollectionPage", name: title, description: energy?.intro ?? copy.overviewBody, url: pageUrl, inLanguage: locale, hasPart: entries.map((item) => {
    const label = item.label[locale] ?? item.label.en;
    const definition = item.definition[locale] ?? copy.sourceNote;
    const interpretation = item.interpretation[locale] ?? copy.sourceNote;
    const years = observationsFor(item.code).map((row) => row.year);
    const period = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "";
    const itemUrl = `${origin}/${locale}/${category}/${item.id}`;
    return validateDatasetSchema({ "@type": "Dataset", name: label, description: createIndicatorDatasetDescription({ definition, interpretation, source: copy.sourceNote, label, code: item.code, periodLabel: copy.referenceYear, period }), url: itemUrl, creator: { "@type": "Organization", name: "World Bank", url: "https://www.worldbank.org/" }, isBasedOn: { "@type": "CreativeWork", name: "World Development Indicators", url: "https://databank.worldbank.org/source/world-development-indicators" }, temporalCoverage: years.length ? `${Math.min(...years)}/${Math.max(...years)}` : undefined, variableMeasured: label });
  }) };
  const breadcrumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: copy.categories[0], item: `${origin}/${locale}` }, { "@type": "ListItem", position: 2, name: title, item: pageUrl }] };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }} />
    <nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}/world`}>{copy.categories[0]}</Link><span>/</span><span>{title}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">{copy.dataSource} · World Bank WDI</span><h1>{title}</h1><p>{energy?.intro ?? copy.overviewBody}</p></header>
    <section className="platform-indicator-section"><div className="platform-section-heading"><div><span className="platform-eyebrow">{copy.indicators}</span><h2>{title}</h2></div><span>{copy.referenceYear}</span></div>
      <div className="platform-indicator-grid">{entries.map((indicator) => {
        const latest = latestByCountry(indicator.code).filter((item) => item.country !== "WLD").sort((a, b) => b.year - a.year)[0];
        return <Link className="platform-indicator-card" href={`/${locale}/${category}/${indicator.id}`} key={indicator.id}>
          <span className="platform-card-label">{indicator.label[locale]}</span>
          <strong>{latest ? format(latest.value, locale, 2) : copy.missing}</strong>
          <span className="platform-card-meta">{latest ? `${localizedCountryName(latest.country, latest.countryName, locale)} · ${latest.year} · ${unitFor(locale, indicator)}` : copy.notAvailable}</span>
          <span className="platform-card-link">{copy.latest} →</span>
        </Link>;
      })}</div>
    </section>
    {energy ? <section className="platform-table-section"><div className="platform-section-heading"><div><span className="platform-eyebrow">EG.ELC.ACCS.ZS</span><h2>{energy.comparison}</h2></div><span>{energy.dateLabel}</span></div><DataTable locale={locale} indicator="EG.ELC.ACCS.ZS" limit={15} /></section> : null}
    <p className="platform-data-note">{energy ? energyAccessCopy[locale].source : copy.sourceNote} <a href={category === "energy" ? "https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS" : "https://data.worldbank.org/summary-terms-of-use"}>{category === "energy" ? "EG.ELC.ACCS.ZS · CC BY 4.0" : "World Bank terms"}</a></p>
  </>;
}

export async function CountryComparison({ locale, requestedCountries, requestedIndicator }: { locale: Locale; requestedCountries?: string[]; requestedIndicator?: string }) {
  const copy = platformCopy[locale];
  const validSelection = [...new Set(requestedCountries?.map((code) => code.toLowerCase()).filter((code) => countryByCode(code)) ?? [])];
  const initialCountries = validSelection && validSelection.length >= 2 && validSelection.length <= 20 ? [...new Set(validSelection)] : ["kr", "us", "jp", "cn", "de", "gb", "fr", "in", "ca", "au"];
  const selectedSource = resolveWorldBankDataSource().source as "json" | "db";
  const requestedIndicatorMeta = indicators.find((item) => item.id === requestedIndicator);
  let initialIndicatorId = requestedIndicatorMeta?.id ?? "population";
  let sourceInfo: Awaited<ReturnType<typeof getReviewedWorldBankSourceInfo>> = null;
  if (selectedSource === "db" && !requestedIndicatorMeta) {
    initialIndicatorId = "unemployment";
  }
  const selectedIndicator = indicators.find((item) => item.id === initialIndicatorId)!;
  let initialSeries: CountrySeries[] = initialCountries.map((code) => {
    const country = countryByCode(code)!;
    return { code: country.code, iso3: country.iso3, observations: observationsFor(selectedIndicator.code, country.iso3).map(({ year, value, unit }) => ({ year, value, unit })) };
  });
  if (worldBankIndicatorSource(selectedSource, selectedIndicator.code) === "db") {
    const [rows, selectedSourceInfo] = await Promise.all([
      compareWorldBankCountries(selectedIndicator.code, initialCountries.map((code) => countryByCode(code)!.iso3)),
      getReviewedWorldBankSourceInfo(selectedIndicator.code),
    ]);
    initialSeries = initialCountries.map((code) => {
      const country = countryByCode(code)!;
      return { code: country.code, iso3: country.iso3, observations: rows.filter((row) => row.countryIso3 === country.iso3).map((row) => ({ year: row.year, value: Number(row.value), unit: row.unit })) };
    });
    sourceInfo = selectedSourceInfo;
  }
  return <><nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}/world`}>{copy.categories[0]}</Link><span>/</span><span>{copy.categories[5]}</span></nav><header className="platform-page-heading"><span className="platform-eyebrow">WORLD BANK / WDI</span><h1>{copy.compare}</h1><p>{copy.sourceNote}</p></header><CountryComparisonDashboard key={`${initialCountries.join(",")}:${initialIndicatorId}`} locale={locale} initialCountries={initialCountries} initialSeries={initialSeries} initialIndicatorId={initialIndicatorId} dataSource={selectedSource} initialSourceInfo={sourceInfo} /></>;
}

export function EmptyCategory({ locale, title }: { locale: Locale; title: string }) {
  const copy = platformCopy[locale];
  return <><nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}/world`}>{copy.categories[0]}</Link><span>/</span><span>{title}</span></nav><header className="platform-page-heading"><span className="platform-eyebrow">{copy.categories[0]}</span><h1>{title}</h1><p>{copy.notAvailable}</p></header><section className="platform-empty-state"><span>{copy.notAvailable}</span><p>{copy.sourceNote}</p><Link href={`/${locale}/world`}>{copy.overview} →</Link></section></>;
}

function DataTable({ locale, indicator, limit = 12 }: { locale: Locale; indicator: string; limit?: number }) {
  const copy = platformCopy[locale];
  const rows = latestByCountry(indicator).filter((row) => row.country !== "WLD").slice(0, limit);
  return <div className="platform-table-scroll"><table className="platform-table"><thead><tr><th>{copy.country}</th><th>{copy.year}</th><th>{copy.value}</th></tr></thead><tbody>{rows.map((row) => { const code = countryCodeForIso3(row.country); return <tr key={row.country}><th scope="row">{code ? <Link href={`/${locale}/countries/${code}`}>{localizedCountryName(row.country, row.countryName, locale)}</Link> : localizedCountryName(row.country, row.countryName, locale)}</th><td>{row.year}</td><td>{format(row.value, locale, 2)}</td></tr>; })}</tbody></table>{rows.length === 0 ? <p className="platform-empty-row">{copy.missing}</p> : null}</div>;
}

function TrendChart({ locale, values, label }: { locale: Locale; values: number[]; label: string }) {
  if (values.length < 2) return <p className="platform-empty-row">{platformCopy[locale].missing}</p>;
  const min = Math.min(...values); const max = Math.max(...values); const span = max - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${92 - ((value - min) / span) * 82}`).join(" ");
  return <div className="platform-chart-wrap"><svg className="platform-trend-chart" viewBox="0 0 100 100" role="img" aria-label={label} preserveAspectRatio="none"><line x1="0" y1="92" x2="100" y2="92"/><polyline points={points}/></svg><div className="platform-chart-labels"><span>{min.toLocaleString()}</span><span>{max.toLocaleString()}</span></div></div>;
}

import Link from "next/link";
import { origin, type Locale } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { indicators } from "@/lib/data-platform/registry";
import { getSnapshotMetadata, latestByCountry, latestForCountry, observationsFor } from "@/lib/data-platform/snapshot";
import { countryByCode, countryCodeForIso3 } from "@/lib/data-platform/countries";
import { CountryComparisonDashboard } from "./country-comparison";
import type { CountrySeries } from "./country-charts";

function format(value: number, locale: Locale, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

const countryIso2: Record<string, string> = { USA:"US", CHN:"CN", IND:"IN", JPN:"JP", KOR:"KR", DEU:"DE", GBR:"GB", FRA:"FR", BRA:"BR", IDN:"ID", MEX:"MX", ZAF:"ZA", NGA:"NG", AUS:"AU", CAN:"CA" };
function localizedCountryName(code: string, fallback: string, locale: Locale) {
  const iso2 = countryIso2[code];
  if (!iso2) return fallback;
  try { return new Intl.DisplayNames([locale], { type: "region" }).of(iso2) ?? fallback; } catch { return fallback; }
}
function indicatorPath(locale: Locale, id: string) {
  const indicator = indicators.find((item) => item.id === id);
  return `/${locale}/${indicator?.category ?? "world"}/${id}`;
}

export function WorldOverview({ locale }: { locale: Locale }) {
  const copy = platformCopy[locale];
  const meta = getSnapshotMetadata();
  const count = latestByCountry("SP.POP.TOTL").filter((item) => item.country !== "WLD").length;
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
  const definition = indicator.definition[locale] ?? indicator.definition.en;
  const interpretation = indicator.interpretation[locale] ?? indicator.interpretation.en;
  const url = `${origin}/${locale}/${indicator.category}/${indicator.id}`;
  const structuredData = { "@context": "https://schema.org", "@type": "Dataset", name: label, description: definition, url, creator: { "@type": "Organization", name: "World Bank" }, temporalCoverage: reference ? `${series[0]?.year ?? reference.year}/${reference.year}` : undefined, variableMeasured: label, license: "https://data.worldbank.org/summary-terms-of-use", distribution: { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `https://api.worldbank.org/v2/country/all/indicator/${indicator.code}?format=json` } };
  const prior = reference ? series.filter((item) => item.year < reference.year).at(-1) : undefined;
  const delta = prior && reference ? (reference.value - prior.value) / Math.abs(prior.value) * 100 : null;
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}/world`}>{copy.categories[0]}</Link><span>/</span><span>{label}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">WORLD BANK / {indicator.code}</span><h1>{label}</h1><p>{definition}</p></header>
    <section className="platform-metric-summary"><div><span>{copy.latest}</span><strong>{reference ? format(reference.value, locale, 2) : copy.missing}</strong><small>{reference ? `${localizedCountryName(reference.country, reference.countryName, locale)} · ${reference.year} · ${indicator.unit}` : copy.notAvailable}</small></div><div><span>{copy.previousChange}</span><strong>{delta === null ? copy.missing : `${delta > 0 ? "+" : ""}${format(delta, locale, 2)}%`}</strong><small>{prior && reference ? `${prior.year} → ${reference.year}` : "—"}</small></div><div><span>{copy.updated}</span><strong>{reference?.lastCheckedAt.slice(0, 10) ?? copy.missing}</strong><small>{copy.dataSource}: {reference?.source ?? "World Bank"}</small></div></section>
    <section className="platform-chart-section"><div className="platform-section-heading"><div><span className="platform-eyebrow">{reference?.countryName ?? "World"}</span><h2>{copy.latest}</h2></div><span>{copy.referenceYear}: {reference?.year ?? "—"}</span></div><TrendChart values={series.map((item) => item.value)} label={`${label}, ${reference?.countryName ?? ""}`} /></section>
    <section className="platform-table-section"><div className="platform-section-heading"><div><span className="platform-eyebrow">{indicator.code}</span><h2>{copy.compare}</h2></div></div><DataTable locale={locale} indicator={indicator.code} /></section>
    <section className="platform-explainer"><article><h2>{copy.definition}</h2><p>{definition}</p></article><article><h2>{copy.interpretation}</h2><p>{interpretation}</p></article><article><h2>{copy.dataSource}</h2><p>{copy.sourceNote} <a href={`https://api.worldbank.org/v2/country/all/indicator/${indicator.code}?format=json`}>World Bank · {indicator.code}</a></p></article></section>
  </>;
}

export function CountryComparison({ locale, requestedCountries }: { locale: Locale; requestedCountries?: string[] }) {
  const copy = platformCopy[locale];
  const validSelection = [...new Set(requestedCountries?.map((code) => code.toLowerCase()).filter((code) => countryByCode(code)) ?? [])];
  const initialCountries = validSelection && validSelection.length >= 2 && validSelection.length <= 5 ? [...new Set(validSelection)] : ["kr", "us", "jp"];
  const initialSeries: CountrySeries[] = initialCountries.map((code) => {
    const country = countryByCode(code)!;
    return { code: country.code, iso3: country.iso3, observations: observationsFor("SP.POP.TOTL", country.iso3).map(({ year, value, unit }) => ({ year, value, unit })) };
  });
  return <><nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}/world`}>{copy.categories[0]}</Link><span>/</span><span>{copy.categories[5]}</span></nav><header className="platform-page-heading"><span className="platform-eyebrow">WORLD BANK / WDI</span><h1>{copy.compare}</h1><p>{copy.sourceNote}</p></header><CountryComparisonDashboard locale={locale} initialCountries={initialCountries} initialSeries={initialSeries} /></>;
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

function TrendChart({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return <p className="platform-empty-row">{platformCopy.en.missing}</p>;
  const min = Math.min(...values); const max = Math.max(...values); const span = max - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${92 - ((value - min) / span) * 82}`).join(" ");
  return <div className="platform-chart-wrap"><svg className="platform-trend-chart" viewBox="0 0 100 100" role="img" aria-label={label} preserveAspectRatio="none"><line x1="0" y1="92" x2="100" y2="92"/><polyline points={points}/></svg><div className="platform-chart-labels"><span>{min.toLocaleString()}</span><span>{max.toLocaleString()}</span></div></div>;
}

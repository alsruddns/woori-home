import Link from "next/link";
import { origin, type Locale } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { scienceCopy, scienceFields } from "@/lib/data-platform/science-copy";
import neoSnapshot from "@/data/nasa-neows.json";

type NeoSnapshot = {
  schemaVersion: number;
  source: string;
  startDate: string;
  endDate: string;
  fetchedAt: string;
  dates: string[];
  objects: { id: string; name: string; closeApproachDate: string; estimatedDiameterMinM: number; estimatedDiameterMaxM: number; missDistanceKm: number; relativeVelocityKmS: number; potentiallyHazardous: boolean; nasaUrl: string }[];
};

const snapshot = neoSnapshot as NeoSnapshot;
const number = (value: number, locale: Locale, digits = 1) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
const hrefForDate = (date: string) => `/science?date=${encodeURIComponent(date)}`;

export function ScienceDashboard({ locale, requestedDate }: { locale: Locale; requestedDate?: string }) {
  const copy = scienceCopy[locale];
  const dates = snapshot.dates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
  const selected = requestedDate && dates.includes(requestedDate) ? requestedDate : requestedDate ? null : dates[0] ?? null;
  const selectedObjects = selected ? snapshot.objects.filter((object) => object.closeApproachDate === selected) : [];
  const position = selected ? dates.indexOf(selected) : -1;
  const selectedLabel = selected ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${selected}T00:00:00Z`)) : "";
  const localeDate = (date: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  const pageUrl = `${origin}/${locale}/science`;
  const pageSchema = { "@context": "https://schema.org", "@type": "WebPage", name: copy.title, description: copy.description, url: pageUrl, inLanguage: locale, dateModified: snapshot.fetchedAt };
  const breadcrumbSchema = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: platformCopy[locale].categories[0], item: `${origin}/${locale}` }, { "@type": "ListItem", position: 2, name: copy.title, item: pageUrl }] };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema).replace(/</g, "\\u003c") }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }} />
    <nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}`}>{platformCopy[locale].categories[0]}</Link><span>/</span><span>{copy.title}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">NASA / JPL</span><h1>{copy.title}</h1><p>{copy.description} {copy.scope}</p></header>
    <section className="platform-summary"><div><span>{copy.facts}</span><strong>{selectedObjects.length}</strong></div><div><span>{copy.date}</span><strong>{selectedLabel || (selected ?? copy.noData)}</strong></div><div><span>{copy.latest}</span><strong>{dates.at(-1) ? localeDate(dates.at(-1)!) : "—"}</strong></div></section>
    <section className="platform-indicator-section"><div className="platform-section-heading"><div><span className="platform-eyebrow">{copy.date}</span><h2>{copy.facts}</h2></div></div>
      <form className="science-date-form" method="get" action={`/${locale}/science`}>
        <label htmlFor="science-date">{copy.date}</label>
        <input id="science-date" name="date" type="date" min={dates[0]} max={dates.at(-1)} list="science-available-dates" defaultValue={requestedDate ?? dates[0] ?? ""} />
        <datalist id="science-available-dates">{dates.map((date) => <option value={date} key={date} />)}</datalist>
        <button type="submit">{copy.date}</button>
      </form>
      <nav className="science-date-navigation" aria-label={copy.date}>
        {position > 0 ? <Link href={hrefForDate(dates[position - 1])}>{copy.previous}: {dates[position - 1]}</Link> : <span aria-disabled="true">{copy.previous}</span>}
        {position >= 0 && position < dates.length - 1 ? <Link href={hrefForDate(dates[position + 1])}>{copy.next}: {dates[position + 1]}</Link> : <span aria-disabled="true">{copy.next}</span>}
      </nav>
      {!selected || selectedObjects.length === 0 ? <div className="platform-empty-state"><strong>{copy.noData}</strong></div> : <div className="neo-grid">{selectedObjects.map((object) => <article className="neo-card" key={`${object.id}-${object.closeApproachDate}`}>
        <div className="neo-card-heading"><h3>{object.name}</h3><span>{localeDate(object.closeApproachDate)}</span></div>
        <dl><div><dt>{scienceFields[locale][0]}</dt><dd>{number(object.missDistanceKm, locale)} km</dd></div><div><dt>{scienceFields[locale][1]}</dt><dd>{number(object.estimatedDiameterMinM, locale)}–{number(object.estimatedDiameterMaxM, locale)} m</dd></div><div><dt>{scienceFields[locale][2]}</dt><dd>{number(object.relativeVelocityKmS, locale, 2)} km/s</dd></div></dl>
        <p className={object.potentiallyHazardous ? "neo-risk" : "neo-normal"}>{scienceFields[locale][object.potentiallyHazardous ? 3 : 4]}</p>
        <a href={object.nasaUrl} target="_blank" rel="noreferrer">NASA JPL</a>
      </article>)}</div>}
    </section>
    <section className="platform-explainer"><article><h2>{copy.title}</h2><p>{copy.hazard}</p></article><article><h2>{copy.source}</h2><p>{copy.updated}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(snapshot.fetchedAt))} UTC</p><p><a href="https://api.nasa.gov/neo/rest/v1/feed" rel="noreferrer">NASA NeoWs API</a> · <a href="https://ssd-api.jpl.nasa.gov/doc/" rel="noreferrer">JPL SSD/CNEOS</a></p></article></section>
  </>;
}

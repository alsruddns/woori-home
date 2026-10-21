import Link from "next/link";
import type { Locale } from "@/lib/site";
import { homeBriefingCopy } from "@/lib/data-platform/home-briefing-copy";
import { latestForCountry } from "@/lib/data-platform/snapshot";
import { researchCopy } from "@/lib/data-platform/research-copy";
import { scienceCopy } from "@/lib/data-platform/science-copy";
import neoSnapshot from "@/data/nasa-neows.json";
import paperSnapshot from "@/data/research-papers.json";

type NeoSnapshot = typeof neoSnapshot;
type NearEarthObject = NeoSnapshot["objects"][number];

const nearEarthSnapshot = neoSnapshot as NeoSnapshot;

export function GlobalDataBriefing({ locale }: { locale: Locale }) {
  const copy = homeBriefingCopy[locale];
  const research = researchCopy[locale];
  const science = scienceCopy[locale];
  const population = latestForCountry("SP.POP.TOTL", "WLD");
  const gdp = latestForCountry("NY.GDP.MKTP.CD", "WLD");
  const electricity = latestForCountry("EG.ELC.ACCS.ZS", "WLD");
  const format = (value: number, digits = 0) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  const papers = [...paperSnapshot.records]
    .filter((paper) => !paper.retracted)
    .sort((a, b) => b.indexedAt.localeCompare(a.indexedAt) || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);
  const today = new Date().toISOString().slice(0, 10);
  const approachDate = nearEarthSnapshot.dates.filter((day) => day >= today).sort()[0] ?? null;
  const approaches = approachDate
    ? nearEarthSnapshot.objects.filter((object) => object.closeApproachDate === approachDate).sort((a, b) => a.missDistanceKm - b.missDistanceKm)
    : [];
  const approachCount = approaches.length;
  const spaceData = approaches.slice(0, 2) as NearEarthObject[];
  const checkedAt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(nearEarthSnapshot.fetchedAt));
  const worldBankLink = (indicator: string) => `https://api.worldbank.org/v2/country/WLD/indicator/${indicator}?format=json`;

  return <section className="global-briefing" aria-labelledby="global-briefing-title">
    <div className="global-briefing-heading">
      <div><span className="platform-eyebrow">{copy.briefing}</span><h2 id="global-briefing-title">{copy.worldIndicators}</h2></div>
      <span className="global-briefing-updated">{copy.snapshotChecked}: {checkedAt} UTC</span>
    </div>
    <div className="global-briefing-grid">
      <article className="global-briefing-panel global-briefing-indicators">
        <h3>{copy.worldIndicators}</h3>
        <div className="global-briefing-metrics">
          <div><Link href={`/${locale}/world/population`}><span>{copy.population}</span></Link><strong><Link href={`/${locale}/world/population`}>{population ? format(population.value) : "—"}</Link></strong><small>{population ? <>{population.year} · <a href={worldBankLink("SP.POP.TOTL")} target="_blank" rel="noreferrer">World Bank</a></> : "—"}</small></div>
          <div><Link href={`/${locale}/economy/gdp`}><span>{copy.gdp}</span></Link><strong><Link href={`/${locale}/economy/gdp`}>{gdp ? new Intl.NumberFormat(locale, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(gdp.value) : "—"}</Link></strong><small>{gdp ? <>{gdp.year} · <a href={worldBankLink("NY.GDP.MKTP.CD")} target="_blank" rel="noreferrer">World Bank</a></> : "—"}</small></div>
          <div><Link href={`/${locale}/energy/electricity-access`}><span>{copy.electricityAccess}</span></Link><strong><Link href={`/${locale}/energy/electricity-access`}>{electricity ? `${format(electricity.value, 1)}%` : "—"}</Link></strong><small>{electricity ? <>{electricity.year} · <a href={worldBankLink("EG.ELC.ACCS.ZS")} target="_blank" rel="noreferrer">World Bank</a></> : "—"}</small></div>
        </div>
        <Link className="global-briefing-link" href={`/${locale}/countries`}>{copy.countryAnalysis}</Link>
      </article>

      <article className="global-briefing-panel">
        <div className="global-briefing-panel-heading"><div><h3>{copy.latestResearch}</h3><p>{copy.researchMetadataOnly}</p></div><Link href={`/${locale}/papers`}>{copy.explore}</Link></div>
        {papers.length ? <ul className="global-briefing-paper-list">{papers.map((paper) => <li key={paper.id}>
          <time dateTime={paper.publishedAt}>{date(paper.publishedAt)}</time>
          <Link href={`/${locale}/papers/${paper.id}`}>{paper.title}</Link>
          <span>{paper.authors.slice(0, 2).join(", ")}{paper.authors.length > 2 ? " et al." : ""} · {paper.journal ?? research.journal} · <a href="https://www.crossref.org/" target="_blank" rel="noreferrer">Crossref</a></span>
        </li>)}</ul> : <p className="global-briefing-empty">{research.noPapers}</p>}
      </article>

      <article className="global-briefing-panel">
        <div className="global-briefing-panel-heading"><div><h3>{copy.spaceData}</h3><p>{approachDate ? `${copy.nextApproach}: ${date(approachDate)} UTC · ${approachCount} ${copy.closeApproaches}` : science.noData}</p></div><Link href={`/${locale}/science${approachDate ? `?date=${approachDate}` : ""}`}>{copy.explore}</Link></div>
        {spaceData.length ? <ul className="global-briefing-neo-list">{spaceData.map((object) => <li key={`${object.id}-${object.closeApproachDate}`}>
          <strong>{object.name}</strong>
          <span>{copy.distance}: {format(object.missDistanceKm)} km</span>
          <span>{copy.diameter}: {format(object.estimatedDiameterMinM, 0)}–{format(object.estimatedDiameterMaxM, 0)} m</span>
          <span className={object.potentiallyHazardous ? "global-briefing-risk" : "global-briefing-normal"}>{object.potentiallyHazardous ? copy.potentiallyHazardous : copy.noHazardClassification}</span>
        </li>)}</ul> : <p className="global-briefing-empty">{science.noData}</p>}
        <p className="global-briefing-source"><a href="https://api.nasa.gov/neo/rest/v1/feed" target="_blank" rel="noreferrer">NASA NeoWs</a> · <a href="https://ssd-api.jpl.nasa.gov/doc/" target="_blank" rel="noreferrer">JPL CNEOS</a></p>
      </article>

      <article className="global-briefing-panel global-briefing-minerals">
        <div><h3>{copy.minerals}</h3><p>{copy.mineralsPending}</p></div>
        <a href="https://www.usgs.gov/data/mineral-commodity-summaries-2026-data-release" target="_blank" rel="noreferrer">USGS Mineral Commodity Summaries 2026</a>
      </article>
    </div>
  </section>;
}

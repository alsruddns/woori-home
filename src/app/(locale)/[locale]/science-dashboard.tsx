import Link from "next/link";
import { Suspense } from "react";
import { origin, type Locale } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { scienceCopy } from "@/lib/data-platform/science-copy";
import neoSnapshot from "@/data/nasa-neows.json";
import { ScienceDateExplorer, ScienceDateExplorerLoading, type NeoObject } from "./science-date-explorer";

type NeoSnapshot = {
  fetchedAt: string;
  dates: string[];
  objects: NeoObject[];
};

const snapshot = neoSnapshot as NeoSnapshot;

export function ScienceDashboard({ locale }: { locale: Locale }) {
  const copy = scienceCopy[locale];
  const pageUrl = `${origin}/${locale}/science`;
  const pageSchema = { "@context": "https://schema.org", "@type": "WebPage", name: copy.title, description: copy.description, url: pageUrl, inLanguage: locale, dateModified: snapshot.fetchedAt };
  const breadcrumbSchema = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: platformCopy[locale].categories[0], item: `${origin}/${locale}` }, { "@type": "ListItem", position: 2, name: copy.title, item: pageUrl }] };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema).replace(/</g, "\\u003c") }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }} />
    <nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}`}>{platformCopy[locale].categories[0]}</Link><span>/</span><span>{copy.title}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">NASA / JPL</span><h1>{copy.title}</h1><p>{copy.description} {copy.scope}</p></header>
    <Suspense fallback={<ScienceDateExplorerLoading locale={locale} />}><ScienceDateExplorer locale={locale} dates={snapshot.dates} objects={snapshot.objects} fetchedAt={snapshot.fetchedAt} /></Suspense>
    <section className="platform-explainer"><article><h2>{copy.title}</h2><p>{copy.hazard}</p></article><article><h2>{copy.source}</h2><p>{copy.updated}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(snapshot.fetchedAt))} UTC</p><p><a href="https://api.nasa.gov/neo/rest/v1/feed" rel="noreferrer">NASA NeoWs API</a> · <a href="https://ssd-api.jpl.nasa.gov/doc/" rel="noreferrer">JPL SSD/CNEOS</a></p></article></section>
  </>;
}

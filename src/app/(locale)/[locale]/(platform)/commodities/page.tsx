import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, origin } from "@/lib/site";
import { mineralCopy } from "@/lib/data-platform/mineral-copy";
import { PortalEducationCards } from "../../portal-education-cards";

const releaseUrl = "https://www.usgs.gov/data/mineral-commodity-summaries-2026-data-release";
const catalogUrl = "https://data.usgs.gov/datacatalog/data/USGS%3A69837ec8b66b01367d7ec7d9";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = mineralCopy[locale];
  const url = `${origin}/${locale}/commodities`;
  return {
    title: copy.title,
    description: copy.description,
    robots: { index: false, follow: true },
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "WOORI.TODAY", title: copy.title, description: copy.description, url },
  };
}

export default async function CommoditiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = mineralCopy[locale];
  return <>
    <nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}`}>{copy.title}</Link><span>/</span><span>{copy.release}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">USGS · {copy.releaseDate}: 2026-09-18</span><h1>{copy.title}</h1><p>{copy.description}</p></header>
    <section className="platform-summary" aria-label={copy.release}>
      <div><span>{copy.release}</span><strong>2026</strong></div>
      <div><span>{copy.releaseDate}</span><strong>2026-09-18</strong></div>
      <div><span>{copy.referencePeriod}</span><strong>2021–2025</strong></div>
    </section>
    <section className="platform-explainer mineral-release-details">
      <article><h2>{copy.scope}</h2><p>{copy.status}</p><p>{copy.unitsNote}</p></article>
      <article><h2>{copy.source}</h2><p><a href={releaseUrl} target="_blank" rel="noreferrer">{copy.source}</a></p><p><a href={catalogUrl} target="_blank" rel="noreferrer">{copy.catalog}</a></p><p>DOI: <a href="https://doi.org/10.5066/P1WKQ63T" target="_blank" rel="noreferrer">10.5066/P1WKQ63T</a> · CC0 1.0</p></article>
    </section>
    <PortalEducationCards locale={locale} topic="commodities" />
  </>;
}

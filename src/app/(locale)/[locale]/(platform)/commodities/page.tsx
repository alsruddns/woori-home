import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, origin } from "@/lib/site";
import { researchCopy } from "@/lib/data-platform/research-copy";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = researchCopy[locale];
  const title = `${copy.commodities} — ${copy.monthlyData}`;
  const url = `${origin}/${locale}/commodities`;
  return { title, description: copy.commoditiesDescription, robots: { index: false, follow: true }, alternates: { canonical: url }, openGraph: { type: "website", siteName: "WOORI.TODAY", title, description: copy.commoditiesDescription, url } };
}

export default async function CommoditiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = researchCopy[locale];
  return <>
    <nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}`}>{researchCopy[locale].commodities}</Link><span>/</span><span>{copy.commodities}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">{copy.monthlyData} · World Bank</span><h1>{copy.commodities}</h1><p>{copy.commoditiesDescription}</p></header>
    <section className="platform-empty-state"><h2>{copy.monthlyData}</h2><p>{copy.rightsPending}</p><p>{copy.unitNote}</p><a href="https://www.worldbank.org/en/research/commodity-markets" target="_blank" rel="noreferrer">{copy.sourceLinkCommodity}</a></section>
  </>;
}

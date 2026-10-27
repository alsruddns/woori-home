import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, origin, alternates } from "@/lib/site";
import { financialOverviewCopy } from "@/lib/data-platform/financial-overview-copy";
import { goldCopy } from "@/lib/data-platform/gold-copy";
import { MarketSnapshot } from "../../market-snapshot";
import { categoryNavigation } from "@/lib/data-platform/category-navigation";
import { RelatedGuides } from "../../related-guides";
import { PortalEducationCards } from "../../portal-education-cards";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = financialOverviewCopy[locale];
  const url = `${origin}/${locale}/markets`;
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: url, languages: alternates("/markets").languages },
    robots: { index: true, follow: true },
    openGraph: { type: "website", siteName: "WOORI.TODAY", title: copy.title, description: copy.description, url },
    twitter: { card: "summary", title: copy.title, description: copy.description },
  };
}

export default async function MarketsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = financialOverviewCopy[locale];
  const worldLabel = categoryNavigation(locale).find((item) => item.id === "world")?.label ?? copy.title;
  return <>
    <nav className="platform-breadcrumb" aria-label={copy.title}><Link href={`/${locale}`}>WOORI.TODAY</Link><span>/</span><span>{copy.title}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">WOORI.TODAY</span><h1>{copy.title}</h1><p>{copy.description}</p></header>
    <MarketSnapshot locale={locale} />
    <PortalEducationCards locale={locale} topic="markets" />
    <RelatedGuides locale={locale} slugs={["crypto-price-observations", "gold-monthly-average-and-units", "compare-country-gdp", "sec-company-fundamentals"]} />
    <nav className="market-snapshot-links" aria-label={copy.title}>
      <Link href={`/${locale}/crypto`}>{copy.usdCrypto} →</Link>
      <Link href={`/${locale}/gold`}>{goldCopy[locale].title} →</Link>
      <Link href={`/${locale}/world`}>{worldLabel} →</Link>
    </nav>
  </>;
}

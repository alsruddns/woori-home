import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { alternates, isLocale, origin } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { dataCategories } from "@/lib/data-platform/registry";
import { portalContent } from "@/lib/portal-content";
import { stockCopy } from "@/lib/data-platform/stock-copy";
import { IndicatorCategory, EmptyCategory } from "../../world-data";
import { StockMarketDashboard, StockMarketLoading } from "../../stock-market-dashboard";
import PortalIntroduction from "../../portal-introduction";
import { energyPageCopy } from "@/lib/data-platform/energy-copy";
import { scienceCopy } from "@/lib/data-platform/science-copy";
import { ScienceDashboard } from "../../science-dashboard";
import { CryptoDashboard, CryptoDashboardLoading } from "../../crypto-dashboard";
import { cryptoCopy } from "@/lib/data-platform/crypto-copy";

const valid = new Set(["economy", "stocks", "crypto", "population", "energy", "science", "about"]);
const categoryIndex: Record<string, number> = { economy: 1, stocks: 2, population: 3, energy: 4, science: 6, about: 7 };
export const dynamicParams = false;
export async function generateStaticParams() { return dataCategories.map(({ id }) => id).filter((id) => valid.has(id)).map((category) => ({ category })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string; category: string }> }): Promise<Metadata> {
  const { locale, category } = await params;
  if (!isLocale(locale) || !valid.has(category)) notFound();
  const copy = platformCopy[locale];
  const title = category === "stocks" ? stockCopy[locale].title : category === "crypto" ? cryptoCopy[locale].title : category === "about" ? portalContent[locale].aboutTitle : category === "science" ? scienceCopy[locale].title : copy.categories[categoryIndex[category]];
  const description = category === "stocks" ? stockCopy[locale].description : category === "crypto" ? cryptoCopy[locale].description : category === "about" ? portalContent[locale].about : category === "science" ? scienceCopy[locale].description : category === "energy" ? energyPageCopy[locale].intro : copy.overviewBody;
  const path = `/${category}`; const url = `${origin}/${locale}${path}`;
  const index = category === "about" || category === "economy" || category === "population" || category === "energy" || category === "science";
  return { title: `${title}`, description, robots: { index, follow: true }, alternates: { canonical: url, languages: alternates(path).languages }, openGraph: { type: "website", siteName: "WOORI.TODAY", title: `${title}`, description, url }, twitter: { card: "summary", title: `${title}`, description } };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ locale: string; category: string }>; searchParams: Promise<{ date?: string }> }) {
  const { locale, category } = await params;
  if (!isLocale(locale) || !valid.has(category)) notFound();
  if (category === "stocks") return <Suspense fallback={<StockMarketLoading locale={locale} />}><StockMarketDashboard locale={locale} /></Suspense>;
  if (category === "crypto") return <Suspense fallback={<CryptoDashboardLoading locale={locale} />}><CryptoDashboard locale={locale} /></Suspense>;
  if (category === "about") return <PortalIntroduction locale={locale} />;
  if (category === "economy" || category === "population") return <IndicatorCategory locale={locale} category={category} title={platformCopy[locale].categories[categoryIndex[category]]} />;
  if (category === "energy") return <IndicatorCategory locale={locale} category="energy" title={platformCopy[locale].categories[categoryIndex.energy]} />;
  if (category === "science") return <ScienceDashboard locale={locale} requestedDate={(await searchParams).date} />;
  return <EmptyCategory locale={locale} title={platformCopy[locale].categories[categoryIndex[category]]} />;
}

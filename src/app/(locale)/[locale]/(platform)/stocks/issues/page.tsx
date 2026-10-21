import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale, origin } from "@/lib/site";
import { stockIssueCopy } from "@/lib/data-platform/market-issue-copy";
import { MarketIssueExplorer } from "../../../market-issue-explorer";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = stockIssueCopy[locale];
  const url = `${origin}/${locale}/stocks/issues`;
  return { title: copy.title, description: copy.description, robots: { index: false, follow: true }, alternates: { canonical: url }, openGraph: { type: "website", siteName: "WOORI.TODAY", title: copy.title, description: copy.description, url } };
}

export default async function StockIssuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <Suspense fallback={<p>{stockIssueCopy[locale].description}</p>}><MarketIssueExplorer locale={locale} market="stocks" /></Suspense>;
}

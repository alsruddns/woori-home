import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale, origin } from "@/lib/site";
import { cryptoCopy } from "@/lib/data-platform/crypto-copy";
import { MarketIssueExplorer } from "../../../market-issue-explorer";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = cryptoCopy[locale];
  const url = `${origin}/${locale}/crypto/issues`;
  return { title: copy.issueTitle, description: copy.issueDescription, robots: { index: false, follow: true }, alternates: { canonical: url }, openGraph: { type: "website", siteName: "WOORI.TODAY", title: copy.issueTitle, description: copy.issueDescription, url } };
}

export default async function CryptoIssuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <Suspense fallback={<p>{cryptoCopy[locale].sourcePending}</p>}><MarketIssueExplorer locale={locale} market="crypto" /></Suspense>;
}

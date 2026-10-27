import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alternates, isLocale, ogLocaleFor, origin } from "@/lib/site";
import { PlatformLayout } from "./platform-layout";
import { PlatformHome } from "./platform-home";
import { financialOverviewCopy } from "@/lib/data-platform/financial-overview-copy";
import "./platform.css";
import "./platform-experience.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const canonical = `${origin}/${locale}`;
  const title = financialOverviewCopy[locale].title;
  const description = financialOverviewCopy[locale].description;
  return {
    title,
    description,
    alternates: { canonical, languages: alternates().languages },
    openGraph: { type: "website", siteName: "WOORI.TODAY", title, description, url: canonical, locale: ogLocaleFor(locale) },
    twitter: { card: "summary", title, description },
  };
}

export const dynamic = "force-dynamic";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <PlatformLayout locale={locale}><PlatformHome locale={locale} /></PlatformLayout>;
}

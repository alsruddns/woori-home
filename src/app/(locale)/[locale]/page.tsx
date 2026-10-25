import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alternates, isLocale, ogLocaleFor, origin } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { PlatformLayout } from "./platform-layout";
import { PlatformHome } from "./platform-home";
import "./platform.css";
import "./platform-experience.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = platformCopy[locale];
  const canonical = `${origin}/${locale}`;
  const title = `${copy.overview}`;
  const description = copy.overviewBody;
  return {
    title,
    description,
    alternates: { canonical, languages: alternates().languages },
    openGraph: { type: "website", siteName: "WOORI.TODAY", title, description, url: canonical, locale: ogLocaleFor(locale) },
    twitter: { card: "summary", title, description },
  };
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <PlatformLayout locale={locale}><PlatformHome locale={locale} /></PlatformLayout>;
}

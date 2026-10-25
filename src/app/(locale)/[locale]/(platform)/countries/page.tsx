import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alternates, isLocale, origin } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { CountryComparison } from "../../world-data";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = platformCopy[locale]; const path = "/countries"; const title = copy.compare; const description = copy.sourceNote; const url = `${origin}/${locale}${path}`;
  return { title: `${title}`, description, alternates: { canonical: url, languages: alternates(path).languages }, openGraph: { type: "website", siteName: "WOORI.TODAY", title: `${title}`, description, url }, twitter: { card: "summary", title: `${title}`, description } };
}

export default async function CountriesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ countries?: string | string[]; indicator?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const selected = query.countries;
  const requestedCountries = typeof selected === "string" ? selected.split(",").slice(0, 6) : [];
  const indicator = query.indicator;
  return <CountryComparison locale={locale} requestedCountries={requestedCountries} requestedIndicator={indicator} />;
}

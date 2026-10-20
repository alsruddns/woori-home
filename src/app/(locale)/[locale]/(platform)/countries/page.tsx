import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alternates, isLocale, origin } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { CountryComparison } from "../../world-data";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = platformCopy[locale]; const path = "/countries"; const title = copy.compare; const description = copy.sourceNote; const url = `${origin}/${locale}${path}`;
  return { title: `${title} | WOORI.TODAY`, description, alternates: { canonical: url, languages: alternates(path).languages }, openGraph: { type: "website", siteName: "WOORI.TODAY", title: `${title} | WOORI.TODAY`, description, url }, twitter: { card: "summary", title: `${title} | WOORI.TODAY`, description } };
}

export default async function CountriesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ countries?: string | string[] }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const selected = (await searchParams).countries;
  const requestedCountries = typeof selected === "string" ? selected.split(",").slice(0, 5) : [];
  return <CountryComparison locale={locale} requestedCountries={requestedCountries} />;
}

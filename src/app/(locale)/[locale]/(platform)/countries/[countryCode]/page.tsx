import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alternates, isLocale, origin } from "@/lib/site";
import { countryByCode, countryName, dataCountries } from "@/lib/data-platform/countries";
import { countryCopy } from "@/lib/data-platform/country-copy";
import { indicators } from "@/lib/data-platform/registry";
import { latestForCountry } from "@/lib/data-platform/snapshot";
import { unitFor } from "@/lib/data-platform/country-units";
import { CountryDashboard } from "../../../country-dashboard";

export const dynamicParams = true;
export async function generateStaticParams() { return dataCountries.map((country) => ({ countryCode: country.code })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string; countryCode: string }> }): Promise<Metadata> {
  const { locale, countryCode } = await params;
  if (!isLocale(locale)) notFound();
  const country = countryByCode(countryCode);
  if (!country) notFound();
  const name = countryName(country.code, locale);
  const copy = countryCopy[locale];
  const latestPopulation = latestForCountry("SP.POP.TOTL", country.iso3);
  const path = `/countries/${country.code}`;
  const title = `${name} · ${copy.dashboard}`;
  const populationIndicator = indicators.find((indicator) => indicator.id === "population")!;
  const populationSummary = latestPopulation
    ? `${latestPopulation.year}: ${new Intl.NumberFormat(locale).format(latestPopulation.value)} ${unitFor(locale, populationIndicator)}`
    : copy.noObservations;
  const description = `${copy.intro} ${name} · ${populationSummary}.`;
  const url = `${origin}/${locale}${path}`;
  return { title: `${title}`, description, alternates: { canonical: url, languages: alternates(path).languages }, openGraph: { type: "article", siteName: "WOORI.TODAY", title, description, url }, twitter: { card: "summary", title, description } };
}

export default async function CountryDetailPage({ params }: { params: Promise<{ locale: string; countryCode: string }> }) {
  const { locale, countryCode } = await params;
  if (!isLocale(locale) || !countryByCode(countryCode)) notFound();
  return <CountryDashboard locale={locale} countryCode={countryCode} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alternatesForLocales, isLocale, locales, origin } from "@/lib/site";
import { indicators } from "@/lib/data-platform/registry";
import { platformCopy } from "@/lib/data-platform/locales";
import { IndicatorPage } from "../../../world-data";

const paths = indicators.filter((item) => item.category !== "world");
export const dynamicParams = false;
export async function generateStaticParams() { return paths.map(({ category, id }) => ({ category, slug: id })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string; category: string; slug: string }> }): Promise<Metadata> {
  const { locale, category, slug } = await params;
  if (!isLocale(locale)) notFound();
  const indicator = paths.find((item) => item.id === slug && item.category === category);
  if (!indicator) notFound();
  const label = indicator.label[locale] ?? indicator.label.en;
  const description = indicator.definition[locale] ?? platformCopy[locale].sourceNote;
  const path = `/${category}/${slug}`; const url = `${origin}/${locale}${path}`;
  const indexableLocales = locales.filter((candidate) => Boolean(indicator.definition[candidate] && indicator.interpretation[candidate]));
  const localized = indexableLocales.includes(locale);
  const preferredDefault = indicator.id === "electricity-access" ? "ko" : "en";
  const defaultLocale = indexableLocales.includes(preferredDefault) ? preferredDefault : indexableLocales[0] ?? "en";
  return { title: `${label}`, description, robots: { index: localized, follow: true }, alternates: { canonical: url, ...(localized ? { languages: alternatesForLocales(path, indexableLocales, defaultLocale).languages } : {}) }, openGraph: { type: "article", siteName: "WOORI.TODAY", title: `${label}`, description, url }, twitter: { card: "summary", title: `${label}`, description } };
}

export default async function IndicatorByCategoryPage({ params }: { params: Promise<{ locale: string; category: string; slug: string }> }) {
  const { locale, category, slug } = await params;
  if (!isLocale(locale) || !paths.some((item) => item.id === slug && item.category === category)) notFound();
  return <IndicatorPage locale={locale} slug={slug} />;
}

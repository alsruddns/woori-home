import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alternates, isLocale, origin } from "@/lib/site";
import { indicators } from "@/lib/data-platform/registry";
import { IndicatorPage } from "../../../world-data";

export const dynamicParams = false;
export async function generateStaticParams() { return indicators.map((item) => ({ slug: item.id })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const indicator = indicators.find((item) => item.id === slug);
  if (!indicator) notFound();
  const label = indicator.label[locale] ?? indicator.label.en;
  const description = indicator.definition[locale] ?? indicator.definition.en;
  const path = `/${indicator.category}/${slug}`;
  const url = `${origin}/${locale}${path}`;
  return { title: `${label}`, description, robots: { index: locale === "ko" || locale === "en", follow: true }, alternates: { canonical: url, languages: alternates(path).languages }, openGraph: { type: "article", siteName: "WOORI.TODAY", title: `${label}`, description, url }, twitter: { card: "summary", title: `${label}`, description } };
}

export default async function IndicatorDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  if (!indicators.some((item) => item.id === slug)) notFound();
  return <IndicatorPage locale={locale} slug={slug} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alternates, isLocale, origin } from "@/lib/site";
import { indicators } from "@/lib/data-platform/registry";
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
  const description = indicator.definition[locale] ?? indicator.definition.en;
  const path = `/${category}/${slug}`; const url = `${origin}/${locale}${path}`;
  return { title: `${label} | WOORI.TODAY`, description, alternates: { canonical: url, languages: alternates(path).languages }, openGraph: { type: "article", siteName: "WOORI.TODAY", title: `${label} | WOORI.TODAY`, description, url }, twitter: { card: "summary", title: `${label} | WOORI.TODAY`, description } };
}

export default async function IndicatorByCategoryPage({ params }: { params: Promise<{ locale: string; category: string; slug: string }> }) {
  const { locale, category, slug } = await params;
  if (!isLocale(locale) || !paths.some((item) => item.id === slug && item.category === category)) notFound();
  return <IndicatorPage locale={locale} slug={slug} />;
}

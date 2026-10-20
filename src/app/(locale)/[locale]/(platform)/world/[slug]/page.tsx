import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, origin } from "@/lib/site";
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
  return { title: `${label} | WOORI.TODAY`, description, robots: { index: locale === "ko" || locale === "en", follow: true }, alternates: { canonical: url, languages: { ko: `${origin}/ko${path}`, en: `${origin}/en${path}`, "x-default": `${origin}/en${path}` } }, openGraph: { type: "article", siteName: "WOORI.TODAY", title: `${label} | WOORI.TODAY`, description, url }, twitter: { card: "summary", title: `${label} | WOORI.TODAY`, description } };
}

export default async function IndicatorDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  if (!indicators.some((item) => item.id === slug)) notFound();
  return <IndicatorPage locale={locale} slug={slug} />;
}

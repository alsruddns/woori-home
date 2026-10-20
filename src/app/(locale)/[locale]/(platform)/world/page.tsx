import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alternates, isLocale, origin } from "@/lib/site";
import { platformCopy } from "@/lib/data-platform/locales";
import { WorldOverview } from "../../world-data";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = platformCopy[locale];
  const url = `${origin}/${locale}/world`;
  return { title: `${copy.overview} | WOORI.TODAY`, description: copy.description, alternates: { canonical: url, languages: alternates("/world").languages }, openGraph: { type: "website", siteName: "WOORI.TODAY", title: `${copy.overview} | WOORI.TODAY`, description: copy.description, url }, twitter: { card: "summary", title: `${copy.overview} | WOORI.TODAY`, description: copy.description } };
}

export default async function WorldPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <WorldOverview locale={locale} />;
}

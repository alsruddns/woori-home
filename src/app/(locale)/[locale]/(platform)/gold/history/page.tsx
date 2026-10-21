import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/site";
import { GoldPage, goldMetadata } from "../gold-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return goldMetadata(locale, "history");
}

export default async function GoldHistory({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <GoldPage localeValue={locale} section="history" />;
}

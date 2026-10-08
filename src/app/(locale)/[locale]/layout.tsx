import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales, messages, origin } from "@/lib/site";
import "../../globals.css";

export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = messages[locale];
  const canonical = `${origin}/${locale}`;
  return {
    metadataBase: new URL(origin),
    title: content.title,
    description: content.description,

    verification: {
      other: {
        "msvalidate.01": "8D9A6810D64EB8733A61244AF6C21A33",
      },
    },
    icons: {
      icon: "/_assets/portal/icon.png",
      apple: "/_assets/portal/apple-icon.png",
    },
    alternates: {
      canonical,
      languages: {
        ko: `${origin}/ko`,
        en: `${origin}/en`,
        ja: `${origin}/ja`,
        zh: `${origin}/zh`,
        "x-default": `${origin}/ko`,
      },
    },
    openGraph: {
      type: "website",
      siteName: "WOORI.TODAY",
      title: content.title,
      description: content.description,
      url: canonical,
      locale: { ko: "ko_KR", en: "en_US", ja: "ja_JP", zh: "zh_CN" }[locale],
    },
    twitter: {
      card: "summary",
      title: content.title,
      description: content.description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}

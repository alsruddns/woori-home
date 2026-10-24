import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Analytics from "../../analytics";
import { alternates, isLocale, locales, messages, ogLocaleFor, origin, localeConfig } from "@/lib/site";
import "../../globals.css";

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
        "google-adsense-account": "ca-pub-8033378933696766",
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/_assets/portal/icon.png", type: "image/png" },
      ],
      apple: "/_assets/portal/apple-icon.png",
    },
    alternates: {
      canonical,
      languages: alternates().languages,
    },
    openGraph: {
      type: "website",
      siteName: "WOORI.TODAY",
      title: content.title,
      description: content.description,
      url: canonical,
      locale: ogLocaleFor(locale),
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
    <html lang={localeConfig.find((item) => item.route === locale)!.hreflang} data-theme="dark" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('woori-platform-theme');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}" }} />
        {children}<Analytics />
      </body>
    </html>
  );
}

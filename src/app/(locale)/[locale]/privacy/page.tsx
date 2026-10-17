import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alternates, isLocale, origin, ogLocaleFor } from "@/lib/site";
import { privacyContent } from "@/lib/privacy";
import { googleAdsSettings } from "@/lib/legal-translations";
import { familySiteHref } from "@/lib/family-sites";
import PortalHeader from "../portal-header";
import PortalFooter from "../portal-footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = privacyContent[locale]!;
  const canonical = `${origin}/${locale}/privacy`;

  return {
    title: content.title,
    description: content.description,
    alternates: { canonical, languages: alternates("/privacy").languages },
    openGraph: {
      type: "website",
      siteName: "WOORI.TODAY",
      title: content.title,
      description: content.description,
      url: canonical,
      locale: ogLocaleFor(locale),
    },
    twitter: { card: "summary", title: content.title, description: content.description },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = privacyContent[locale]!;

  return (
    <>
      <PortalHeader locale={locale} />
      <main className="legal-page">
        <article className="legal-content">
          <header className="legal-heading">
            <span className="section-kicker">WOORI.TODAY / {copy.title.toUpperCase()}</span>
            <h1>{copy.title}</h1>
            <p className="legal-updated">{copy.updated}</p>
            <p className="legal-intro">{copy.intro}</p>
          </header>
          {copy.sections.map((section, index) => (
            <section className="legal-section" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
              {index === 4 && (
                <p className="legal-links"><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">{copy.googleLabel}</a><a href="https://myadcenter.google.com/" target="_blank" rel="noreferrer">{googleAdsSettings[locale]}</a></p>
              )}
              {index === 5 && <p className="legal-links"><a href={`${familySiteHref(locale, "moneyBook")}/privacy`}>{copy.moneyLabel}</a></p>}
            </section>
          ))}
        </article>
      </main>
      <PortalFooter locale={locale} />
    </>
  );
}

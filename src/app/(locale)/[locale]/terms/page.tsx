import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alternates, isLocale, origin, ogLocaleFor } from "@/lib/site";
import { termsContent } from "@/lib/terms";
import { familySiteHref } from "@/lib/family-sites";
import PortalHeader from "../portal-header";
import PortalFooter from "../portal-footer";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = termsContent[locale]!;
  const canonical = `${origin}/${locale}/terms`;
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical, languages: alternates("/terms").languages },
    openGraph: {
      type: "website",
      siteName: "WOORI.TODAY",
      title: copy.title,
      description: copy.description,
      url: canonical,
      locale: ogLocaleFor(locale),
    },
    twitter: { card: "summary", title: copy.title, description: copy.description },
  };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = termsContent[locale]!;
  return (
    <>
      <PortalHeader locale={locale} />
      <main className="legal-page">
        <article className="legal-content">
          <header className="legal-heading">
            <span className="section-kicker">WOORI.TODAY / {copy.terms.toUpperCase()}</span>
            <h1>{copy.title}</h1>
            <p className="legal-intro">{copy.intro}</p>
          </header>
          {copy.sections.map((section, index) => (
            <section className="legal-section" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
              {index === 8 && <p className="legal-links"><a href={`/${locale}/privacy`}>{copy.privacyLabel}</a></p>}
              {index === 12 && <p className="legal-links"><a href={`${familySiteHref(locale, "moneyBook")}/terms`}>{copy.moneyLabel}</a></p>}
            </section>
          ))}
        </article>
      </main>
      <PortalFooter locale={locale} />
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { alternates, isLocale, origin, ogLocaleFor } from "@/lib/site";
import LanguageSelector from "../language-selector";
import { privacyContent } from "@/lib/privacy";
import { messages, uiLabels } from "@/lib/site";
import { googleAdsSettings } from "@/lib/legal-translations";

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
  const nav = messages[locale];

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href={`/${locale}`}>
            <Image className="brand-logo" src="/_assets/portal/woori-logo.png" alt="WOORI.TODAY" width={419} height={99} priority />
          </a>
          <nav className="main-nav" aria-label={uiLabels[locale].primaryNav}>
            <a href={`/${locale}`}>{nav.home}</a>
            <a href={`/${locale}/money`}>{nav.money}</a>
            <a href={`/${locale}/calculators`}>{nav.calculators}</a>
            <a href={`/${locale}/tools`}>{nav.tools}</a>
          </nav>
          <LanguageSelector locale={locale} />
        </div>
      </header>
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
              {index === 5 && <p className="legal-links"><a href={`/${locale}/money/privacy`}>{copy.moneyLabel}</a></p>}
            </section>
          ))}
        </article>
      </main>
      <footer className="site-footer">
        <div className="footer-main section-wrap">
          <div><a className="brand footer-brand" href={`/${locale}`}><Image className="brand-logo" src="/_assets/portal/woori-logo.png" alt="WOORI.TODAY" width={419} height={99} /></a><p>{messages[locale].footer}</p></div>
          <div className="footer-services"><a href={`/${locale}/money`}>{nav.money}</a><a href={`/${locale}/calculators`}>{nav.calculators}</a><a href={`/${locale}/tools`}>{nav.tools}</a><a href={`/${locale}/privacy`}>{copy.title}</a></div>
        </div>
        <div className="footer-bottom section-wrap"><span>© {new Date().getFullYear()} WOORI.TODAY</span><LanguageSelector locale={locale} /><span className="footer-domain">www.woori.today</span></div>
      </footer>
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { alternates, isLocale, origin, ogLocaleFor } from "@/lib/site";
import LanguageSelector from "../language-selector";
import { termsContent } from "@/lib/terms";
import { messages, uiLabels } from "@/lib/site";
import FamilySiteSelect from "../family-site-select";
import ContactDialog from "../contact-dialog";
import { familyContactCopy } from "@/lib/family-contact";

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
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href={`/${locale}`} aria-label={familyContactCopy[locale].logoLabel}><Image className="brand-logo" src="/_assets/portal/woori-logo.png" alt="" width={419} height={99} priority /></a>
          <nav className="main-nav" aria-label={uiLabels[locale].primaryNav}>
            <a href={`/${locale}`}>{copy.home}</a><a href={`/${locale}/money`}>{messages[locale].money}</a><a href={`/${locale}/calculators`}>{messages[locale].calculators}</a><a href={`/${locale}/tools`}>{messages[locale].tools}</a>
          </nav>
          <div className="header-controls"><FamilySiteSelect locale={locale} /><LanguageSelector locale={locale} /></div>
        </div>
      </header>
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
              {index === 12 && <p className="legal-links"><a href={`/${locale}/money/terms`}>{copy.moneyLabel}</a></p>}
            </section>
          ))}
        </article>
      </main>
      <footer className="site-footer">
        <div className="footer-main section-wrap">
          <div><a className="brand footer-brand" href={`/${locale}`} aria-label={familyContactCopy[locale].logoLabel}><Image className="brand-logo" src="/_assets/portal/woori-logo.png" alt="" width={419} height={99} /></a><p>{copy.footer}</p></div>
          <div className="footer-services"><a href={`/${locale}/money`}>{messages[locale].money}</a><a href={`/${locale}/calculators`}>{messages[locale].calculators}</a><a href={`/${locale}/tools`}>{messages[locale].tools}</a><a href={`/${locale}/privacy`}>{copy.privacy}</a><a href={`/${locale}/terms`}>{copy.terms}</a><ContactDialog locale={locale} /></div>
        </div>
        <div className="footer-bottom section-wrap"><span>© {new Date().getFullYear()} WOORI.TODAY</span><LanguageSelector locale={locale} /><span className="footer-domain">www.woori.today</span></div>
      </footer>
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { alternates, isLocale, localeNames, locales, origin } from "@/lib/site";
import { termsContent } from "@/lib/terms";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = termsContent[locale];
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
      locale: { ko: "ko_KR", en: "en_US", ja: "ja_JP", zh: "zh_CN" }[locale],
    },
    twitter: { card: "summary", title: copy.title, description: copy.description },
  };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = termsContent[locale];
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href={`/${locale}`}><Image className="brand-logo" src="/_assets/portal/woori-logo.png" alt="WOORI.TODAY" width={419} height={99} priority /></a>
          <nav className="main-nav" aria-label="Main navigation">
            <a href={`/${locale}`}>{copy.home}</a><a href={`/${locale}/money`}>MoneyBook</a><a href={`/${locale}/calculators`}>Calculator</a><a href={`/${locale}/tools`}>Tools</a>
          </nav>
          <nav className="language-nav" aria-label="Language">
            {locales.map((item) => <a key={item} href={`/${item}/terms`} lang={item} aria-current={item === locale ? "page" : undefined} title={localeNames[item]}>{item.toUpperCase()}</a>)}
          </nav>
        </div>
      </header>
      <main className="legal-page">
        <article className="legal-content">
          <header className="legal-heading">
            <span className="section-kicker">WOORI.TODAY / TERMS</span>
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
          <div><a className="brand footer-brand" href={`/${locale}`}><Image className="brand-logo" src="/_assets/portal/woori-logo.png" alt="WOORI.TODAY" width={419} height={99} /></a><p>{copy.footer}</p></div>
          <div className="footer-services"><a href={`/${locale}/money`}>MoneyBook</a><a href={`/${locale}/calculators`}>Calculator</a><a href={`/${locale}/tools`}>Tools</a><a href={`/${locale}/privacy`}>{copy.privacy}</a><a href={`/${locale}/terms`}>{copy.terms}</a></div>
        </div>
        <div className="footer-bottom section-wrap"><span>© {new Date().getFullYear()} WOORI.TODAY</span><nav aria-label="Language">{locales.map((item) => <a key={item} href={`/${item}/terms`} lang={item} aria-current={item === locale ? "page" : undefined}>{localeNames[item]}</a>)}</nav><span className="footer-domain">www.woori.today</span></div>
      </footer>
    </>
  );
}

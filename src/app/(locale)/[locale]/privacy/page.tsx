import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { alternates, isLocale, localeNames, locales, origin } from "@/lib/site";
import { privacyContent } from "@/lib/privacy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = privacyContent[locale];
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
      locale: { ko: "ko_KR", en: "en_US", ja: "ja_JP", zh: "zh_CN" }[locale],
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
  const copy = privacyContent[locale];

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href={`/${locale}`}>
            <Image className="brand-logo" src="/_assets/portal/woori-logo.png" alt="WOORI.TODAY" width={419} height={99} priority />
          </a>
          <nav className="main-nav" aria-label="Main navigation">
            <a href={`/${locale}`}>{locale === "ko" ? "홈" : locale === "ja" ? "ホーム" : locale === "zh" ? "首页" : "Home"}</a>
            <a href={`/${locale}/money`}>MoneyBook</a>
            <a href={`/${locale}/calculators`}>Calculator</a>
            <a href={`/${locale}/tools`}>Tools</a>
          </nav>
          <nav className="language-nav" aria-label="Language">
            {locales.map((item) => <a key={item} href={`/${item}/privacy`} lang={item} aria-current={item === locale ? "page" : undefined} title={localeNames[item]}>{item.toUpperCase()}</a>)}
          </nav>
        </div>
      </header>
      <main className="legal-page">
        <article className="legal-content">
          <header className="legal-heading">
            <span className="section-kicker">WOORI.TODAY / PRIVACY</span>
            <h1>{copy.title}</h1>
            <p className="legal-updated">{copy.updated}</p>
            <p className="legal-intro">{copy.intro}</p>
          </header>
          {copy.sections.map((section, index) => (
            <section className="legal-section" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
              {index === 4 && (
                <p className="legal-links"><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">{copy.googleLabel}</a><a href="https://myadcenter.google.com/" target="_blank" rel="noreferrer">{locale === "ko" ? "Google 광고 설정" : locale === "ja" ? "Google 広告設定" : locale === "zh" ? "Google 广告设置" : "Google ad settings"}</a></p>
              )}
              {index === 5 && <p className="legal-links"><a href={`/${locale}/money/privacy`}>{copy.moneyLabel}</a></p>}
            </section>
          ))}
        </article>
      </main>
      <footer className="site-footer">
        <div className="footer-main section-wrap">
          <div><a className="brand footer-brand" href={`/${locale}`}><Image className="brand-logo" src="/_assets/portal/woori-logo.png" alt="WOORI.TODAY" width={419} height={99} /></a><p>WOORI.TODAY</p></div>
          <div className="footer-services"><a href={`/${locale}/money`}>MoneyBook</a><a href={`/${locale}/calculators`}>Calculator</a><a href={`/${locale}/tools`}>Tools</a><a href={`/${locale}/privacy`}>{copy.title}</a></div>
        </div>
        <div className="footer-bottom section-wrap"><span>© {new Date().getFullYear()} WOORI.TODAY</span><nav aria-label="Language">{locales.map((item) => <a key={item} href={`/${item}/privacy`} lang={item} aria-current={item === locale ? "page" : undefined}>{localeNames[item]}</a>)}</nav><span className="footer-domain">www.woori.today</span></div>
      </footer>
    </>
  );
}

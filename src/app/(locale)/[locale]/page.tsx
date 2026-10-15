import { notFound } from "next/navigation";
import Image from "next/image";
import { hreflangFor, isLocale, localeNames, locales, messages, newTabLabels, sectionLabels, type Locale } from "@/lib/site";
import { calculators, tools } from "@/lib/site";
import { privacyContent } from "@/lib/privacy";
import { termsContent } from "@/lib/terms";
import LanguageSelector from "./language-selector";
import FamilySiteNav from "./family-site-select";
import ContactDialog from "./contact-dialog";
import { familyContactCopy } from "@/lib/family-contact";
import { familySitesCopy } from "@/lib/family-sites";

const serviceHrefs = { money: (locale: Locale) => `/${locale}/money`, calculators: (locale: Locale) => `/${locale}/calculators`, tools: (locale: Locale) => `/${locale}/tools`, docs: (locale: Locale) => `/${locale}/docs`, quiz: (locale: Locale) => `/${locale}/quiz` };
const serviceIcons = { money: "↗", calculators: "∑", tools: "⌘", docs: "▤", quiz: "?" };
const monthlyViews: Record<Locale, string> = { ko: "월별 관리", en: "Monthly view", ja: "月ごとの管理", zh: "按月管理", es: "Vista mensual", "pt-br": "Visão mensal", de: "Monatsübersicht", fr: "Vue mensuelle", vi: "Theo dõi theo tháng", id: "Tampilan bulanan", th: "มุมมองรายเดือน", "zh-tw": "每月檢視", it: "Vista mensile", nl: "Maandoverzicht", hi: "मासिक दृश्य" };

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = messages[locale];
  const familyCopy = familySitesCopy[locale];
  const services = [
    { key: "calculators" as const, title: copy.calcTitle, description: copy.calcDesc, cta: copy.seeCalculators, href: serviceHrefs.calculators(locale), className: "service-card service-card-calculator" },
    { key: "tools" as const, title: copy.toolsTitle, description: copy.toolsDesc, cta: copy.seeTools, href: serviceHrefs.tools(locale), className: "service-card service-card-tools" },
    { key: "money" as const, title: copy.moneyTitle, description: copy.moneyDesc, cta: copy.start, href: serviceHrefs.money(locale), className: "service-card service-card-money" },
    { key: "docs" as const, title: familyCopy.docsTitle, description: familyCopy.docsDescription, cta: familyCopy.docsCta, href: serviceHrefs.docs(locale), className: "service-card service-card-docs" },
    { key: "quiz" as const, title: familyCopy.quizTitle, description: familyCopy.quizDescription, cta: familyCopy.quizCta, href: serviceHrefs.quiz(locale), className: "service-card service-card-quiz" },
  ];
  const jsonLd = { "@context": "https://schema.org", "@type": "WebSite", name: "WOORI.TODAY", url: `https://www.woori.today/${locale}`, inLanguage: hreflangFor(locale), hasPart: ["money", "calculators", "tools", "docs", "quiz"].map((service) => ({ "@type": "WebSite", name: service === "money" ? copy.money : service === "calculators" ? copy.calculators : service === "tools" ? copy.tools : service === "docs" ? familyCopy.sites.docs : familyCopy.sites.quiz, url: `https://www.woori.today/${locale}/${service === "calculators" ? "calculators" : service}` })) };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <header className="site-header"><div className="header-inner">
      <a className="brand" href={`/${locale}`} aria-label={familyContactCopy[locale].logoLabel}><Image className="brand-logo" src="/_assets/portal/woori-logo.png" alt="" width={419} height={99} priority /></a>
      <FamilySiteNav locale={locale} />
      <div className="header-controls"><LanguageSelector locale={locale} /></div>
    </div></header>
    <main>
      <section className="services section-wrap" aria-labelledby="services-heading"><div className="section-heading"><div><h2 id="services-heading">{copy.featured}</h2></div></div><div className="service-grid">{services.map((service, index) => <a className={`${service.className} service-card-link`} href={service.href} key={service.key} target="_blank" rel="noopener noreferrer" aria-label={`${service.title}: ${service.cta}, ${newTabLabels[locale]}`}><div className="card-top"><span className="card-index">0{index + 1}</span><span className="card-icon" aria-hidden="true">{serviceIcons[service.key]}</span></div><h3>{service.title}</h3><p>{service.description}</p><span className="text-link" aria-hidden="true">{service.cta}<span>↗</span></span></a>)}</div></section>
      <section className="hero"><div className="hero-inner"><div className="hero-copy"><span className="eyebrow"><span className="eyebrow-dot" />{copy.eyebrow}</span><h1>{copy.headline}</h1><p>{copy.intro}</p></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-core"><span>W</span></div><div className="orbit-chip chip-money">₩</div><div className="orbit-chip chip-calc">∑</div><div className="orbit-chip chip-tools">⌘</div><span className="art-caption">WOORI.TODAY</span></div></div></section>
      <section className="money-section"><div className="money-layout section-wrap"><div className="money-copy"><span className="section-kicker">02 / MONEYBOOK</span><span className="section-label">{copy.moneyKicker}</span><h2>{copy.moneyHeading}</h2><p>{copy.moneyBody}</p><a className="button button-light" href={serviceHrefs.money(locale)}>{copy.start}<span aria-hidden="true">→</span></a></div><div className="feature-panel"><div className="panel-heading"><span className="panel-dot"/><span>MoneyBook</span><span className="panel-month">{monthlyViews[locale]}</span></div>{copy.features.map((feature, i) => <div className="feature-row" key={feature}><span className="feature-check">✓</span><span>{feature}</span><span className="feature-number">0{i + 1}</span></div>)}</div></div></section>
      <section className="catalog-section section-wrap"><div className="section-heading"><div><span className="section-kicker">03 / {sectionLabels[locale].calculator.toUpperCase()}</span><h2>{copy.calculatorsHeading}</h2><p>{copy.calculatorsBody}</p></div><a className="text-link heading-link" href={serviceHrefs.calculators(locale)}>{copy.moreCalculators}<span aria-hidden="true">→</span></a></div><div className="catalog-grid">{calculators.map((item) => <a className="catalog-card" key={item.slug} href={`/${locale}/calculators/${item.slug}`}><span className="catalog-category">{copy.groups[item.category as keyof typeof copy.groups]}</span><span className="catalog-name">{item.names[locale]}</span><span className="catalog-arrow" aria-hidden="true">↗</span></a>)}</div></section>
      <section className="tools-section"><div className="section-wrap"><div className="section-heading"><div><span className="section-kicker">04 / {sectionLabels[locale].tools.toUpperCase()}</span><h2>{copy.toolsHeading}</h2><p>{copy.toolsBody}</p></div><a className="text-link heading-link" href={serviceHrefs.tools(locale)}>{copy.moreTools}<span aria-hidden="true">→</span></a></div><div className="catalog-grid">{tools.map((item) => <a className="catalog-card tool-card" key={item.slug} href={`/${locale}/tools/${item.slug}`}><span className="catalog-category">{copy.groups[item.category as keyof typeof copy.groups]}</span><span className="catalog-name">{item.names[locale]}</span><span className="catalog-arrow" aria-hidden="true">↗</span></a>)}</div></div></section>
      <section className="closing-cta section-wrap"><div><span className="section-kicker">WOORI.TODAY</span><h2>{copy.eyebrow}</h2></div><div className="closing-links"><a href={serviceHrefs.money(locale)}>{copy.money}<span>↗</span></a><a href={serviceHrefs.calculators(locale)}>{copy.calculators}<span>↗</span></a><a href={serviceHrefs.tools(locale)}>{copy.tools}<span>↗</span></a><a href={serviceHrefs.docs(locale)}>{familyCopy.sites.docs}<span>↗</span></a><a href={serviceHrefs.quiz(locale)}>{familyCopy.sites.quiz}<span>↗</span></a></div></section>
    </main>
    <footer className="site-footer"><div className="footer-main section-wrap"><div><a className="brand footer-brand" href={`/${locale}`} aria-label={familyContactCopy[locale].logoLabel}><Image className="brand-logo" src="/_assets/portal/woori-logo.png" alt="" width={419} height={99} /></a><p>{copy.footer}</p></div><div className="footer-services"><span>{copy.featured}</span>{(["money", "calculators", "tools", "docs", "quiz"] as const).map((service) => <a key={service} href={service === "money" ? serviceHrefs.money(locale) : service === "calculators" ? serviceHrefs.calculators(locale) : service === "tools" ? serviceHrefs.tools(locale) : service === "docs" ? serviceHrefs.docs(locale) : serviceHrefs.quiz(locale)}>{service === "money" ? copy.money : service === "calculators" ? copy.calculators : service === "tools" ? copy.tools : familyCopy.sites[service]}</a>)}<a href={`/${locale}/privacy`}>{privacyContent[locale]!.title}</a><a href={`/${locale}/terms`}>{termsContent[locale]!.terms}</a><ContactDialog locale={locale} /></div></div><div className="footer-bottom section-wrap"><span>© {new Date().getFullYear()} WOORI.TODAY</span><LanguageSelector locale={locale} /><span className="footer-languages">{locales.map((item, index) => <span key={item}>{index > 0 ? " · " : ""}{localeNames[item]}</span>)}</span><span className="footer-domain">www.woori.today</span></div></footer>
  </>;
}

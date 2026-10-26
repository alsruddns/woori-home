import { calculators, hreflangFor, messages, newTabLabels, sectionLabels, tools, type Locale } from "@/lib/site";
import { familySiteHref, familySitesCopy } from "@/lib/family-sites";
import { portalContent, portalUpdates } from "@/lib/portal-content";

const serviceHrefs = { calculators: (locale: Locale) => familySiteHref(locale, "calculator"), tools: (locale: Locale) => familySiteHref(locale, "tools"), docs: (locale: Locale) => familySiteHref(locale, "docs"), quiz: (locale: Locale) => familySiteHref(locale, "quiz") };
const serviceIcons = { money: "↗", calculators: "∑", tools: "⌘", docs: "▤", quiz: "?" };

export default function PortalIntroduction({ locale }: { locale: Locale }) {
  const copy = messages[locale];
  const familyCopy = familySitesCopy[locale];
  const content = portalContent[locale];
  const services = [
    { key: "calculators" as const, title: familyCopy.sites.calculator, description: content.details.calculator, cta: copy.seeCalculators, href: serviceHrefs.calculators(locale), className: "service-card service-card-calculator" },
    { key: "tools" as const, title: familyCopy.sites.tools, description: content.details.tools, cta: copy.seeTools, href: serviceHrefs.tools(locale), className: "service-card service-card-tools" },
    { key: "docs" as const, title: familyCopy.sites.docs, description: content.details.docs, cta: familyCopy.docsCta, href: serviceHrefs.docs(locale), className: "service-card service-card-docs" },
    { key: "quiz" as const, title: familyCopy.sites.quiz, description: content.details.quiz, cta: familyCopy.quizCta, href: serviceHrefs.quiz(locale), className: "service-card service-card-quiz" },
  ];
  const jsonLd = {
    "@context": "https://schema.org", "@type": "WebSite", name: "WOORI.TODAY",
    url: `https://www.woori.today/${locale}`, inLanguage: hreflangFor(locale),
    hasPart: services.map((service) => ({ "@type": "WebSite", name: service.title, url: `https://www.woori.today${service.href}` })),
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <main>
      <section className="hero"><div className="hero-inner"><div className="hero-copy"><span className="eyebrow"><span className="eyebrow-dot" />{copy.eyebrow}</span><h1>{copy.headline}</h1><p>{copy.intro}</p></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-core"><span>W</span></div><div className="orbit-chip chip-money">₩</div><div className="orbit-chip chip-calc">∑</div><div className="orbit-chip chip-tools">⌘</div><span className="art-caption">WOORI.TODAY</span></div></div></section>

      <section className="portal-about section-wrap" aria-labelledby="about-heading">
        <div className="portal-about-copy"><span className="section-kicker">WOORI.TODAY</span><h2 id="about-heading">{content.aboutTitle}</h2><p>{content.about}</p></div>
        <div className="portal-audience"><h3>{content.audienceTitle}</h3><ul>{content.audiences.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </section>

      <section className="services section-wrap" aria-labelledby="services-heading"><div className="section-heading"><div><h2 id="services-heading">{copy.featured}</h2></div></div><div className="service-grid">{services.map((service, index) => <a className={`${service.className} service-card-link`} href={service.href} key={service.key} target="_blank" rel="noopener noreferrer" aria-label={`${service.title}: ${service.cta}, ${newTabLabels[locale]}`}><div className="card-top"><span className="card-index">0{index + 1}</span><span className="card-icon" aria-hidden="true">{serviceIcons[service.key]}</span></div><h3>{service.title}</h3><p>{service.description}</p><span className="text-link" aria-hidden="true">{service.cta}<span>↗</span></span></a>)}</div></section>

      <section className="portal-how"><div className="section-wrap"><span className="section-kicker">WOORI.TODAY</span><h2>{content.howTitle}</h2><ol className="portal-steps">{content.how.map((step, index) => <li key={step}><span aria-hidden="true">0{index + 1}</span><p>{step}</p></li>)}</ol></div></section>


      <section className="catalog-section section-wrap"><div className="section-heading"><div><span className="section-kicker">{sectionLabels[locale].calculator.toUpperCase()}</span><h2>{copy.calculatorsHeading}</h2><p>{copy.calculatorsBody}</p></div><a className="text-link heading-link" href={serviceHrefs.calculators(locale)}>{copy.moreCalculators}<span aria-hidden="true">→</span></a></div><div className="catalog-grid">{calculators.map((item) => <a className="catalog-card" key={item.slug} href={`/${locale}/calculators/${item.slug}`}><span className="catalog-category">{copy.groups[item.category as keyof typeof copy.groups]}</span><span className="catalog-name">{item.names[locale]}</span><span className="catalog-arrow" aria-hidden="true">↗</span></a>)}</div></section>

      <section className="tools-section"><div className="section-wrap"><div className="section-heading"><div><span className="section-kicker">{sectionLabels[locale].tools.toUpperCase()}</span><h2>{copy.toolsHeading}</h2><p>{copy.toolsBody}</p></div><a className="text-link heading-link" href={serviceHrefs.tools(locale)}>{copy.moreTools}<span aria-hidden="true">→</span></a></div><div className="catalog-grid">{tools.map((item) => <a className="catalog-card tool-card" key={item.slug} href={`/${locale}/tools/${item.slug}`}><span className="catalog-category">{copy.groups[item.category as keyof typeof copy.groups]}</span><span className="catalog-name">{item.names[locale]}</span><span className="catalog-arrow" aria-hidden="true">↗</span></a>)}</div></div></section>

      <section className="portal-why section-wrap"><div><span className="section-kicker">WOORI.TODAY</span><h2>{content.whyTitle}</h2><ul>{content.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div><aside className="portal-privacy"><h3>{content.privacyTitle}</h3><p>{content.privacy}</p><a className="text-link" href={`/${locale}/privacy`}>{copy.learnMore}<span aria-hidden="true">→</span></a></aside></section>

      <section className="portal-updates"><div className="section-wrap"><span className="section-kicker">WOORI.TODAY</span><h2>{content.updatesTitle}</h2><ol>{portalUpdates.map((item, index) => <li key={item.id}><time dateTime={item.date}>{item.date}</time><p>{content.updates[index]}</p></li>)}</ol></div></section>

      <section className="portal-faq section-wrap" aria-labelledby="faq-heading"><span className="section-kicker">WOORI.TODAY</span><h2 id="faq-heading">{content.faqTitle}</h2><div className="faq-list">{content.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
    </main>
  </>;
}

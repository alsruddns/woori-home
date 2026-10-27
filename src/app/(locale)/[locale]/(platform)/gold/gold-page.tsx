import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { goldCopy, goldSectionTitle, goldSourceTermsLabel, type GoldPageSection } from "@/lib/data-platform/gold-copy";
import { alternates, isLocale, origin } from "@/lib/site";
import { GoldUnavailableDate } from "./gold-unavailable-date";
import { GoldDbQuotes } from "./gold-db-quotes";

const routeFor = (section: GoldPageSection) => section === "overview" ? "/gold" : `/gold/${section}`;

export function goldMetadata(localeValue: string, section: GoldPageSection): Metadata {
  if (!isLocale(localeValue)) return {};
  const locale = localeValue;
  const copy = goldCopy[locale];
  const title = goldSectionTitle(locale, section);
  const description = section === "overview" ? copy.description
    : section === "buy-sell" ? `${copy.buySell}. ${copy.distinction}`
    : `${copy.history}. ${copy.calculationNote}`;
  const url = `${origin}/${locale}${routeFor(section)}`;
  return {
    title,
    description,
    robots: { index: section === "overview", follow: true },
    alternates: { canonical: url, languages: section === "overview" ? alternates("/gold").languages : undefined },
    openGraph: { type: "website", siteName: "WOORI.TODAY", title, description, url },
    twitter: { card: "summary", title, description },
  };
}

export function GoldPage({ localeValue, section }: { localeValue: string; section: GoldPageSection }) {
  if (!isLocale(localeValue)) return null;
  const locale = localeValue;
  const copy = goldCopy[locale];
  const title = goldSectionTitle(locale, section);
  const url = section === "overview" ? `/${locale}/gold` : `/${locale}/gold/${section}`;
  return <>
    <nav className="platform-breadcrumb" aria-label={copy.navLabel}><Link href={`/${locale}/gold`}>{copy.title}</Link><span>/</span><span>{title}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">{copy.title}</span><h1>{title}</h1><p>{section === "overview" ? copy.description : section === "buy-sell" ? copy.distinction : copy.calculationNote}</p></header>
    <nav className="gold-tabs" aria-label={copy.navLabel}>
      {(["overview", "buy-sell", "history"] as GoldPageSection[]).map((item) => <Link key={item} href={routeFor(item).startsWith("/") ? `/${locale}${routeFor(item)}` : url} aria-current={item === section ? "page" : undefined}>{goldSectionTitle(locale, item)}</Link>)}
    </nav>
    <GoldDbQuotes locale={locale} section={section} copy={copy} fallback={<section className="gold-unavailable" aria-live="polite"><span className="platform-eyebrow">{copy.pendingTitle}</span><h2>{copy.unavailableTitle}</h2><p>{copy.unavailable}</p><Suspense fallback={<p>{copy.noQuote}</p>}><GoldUnavailableDate locale={locale} label={copy.dateLabel} emptyText={copy.noQuote} /></Suspense></section>} />
    <section className="platform-explainer gold-explainers">
      {section !== "buy-sell" ? <article><h2>{copy.marketReference}</h2><p>{copy.sourceNote}</p></article> : null}
      {section !== "history" ? <article><h2>{copy.customerBuy} / {copy.customerSell}</h2><p>{copy.distinction}</p><p>{copy.conditions}</p></article> : null}
      <article><h2>{copy.calculationTitle}</h2><p>{copy.calculationNote}</p><p>{copy.unitGram} ↔ {copy.unitDon}.</p></article>
      <article><h2>{copy.sourceTitle}</h2><ul><li><a href="https://global.krx.co.kr/contents/GLB/02/0201/0201050202/GLB0201050202.jsp" target="_blank" rel="noreferrer">{copy.sourceKrx}</a></li><li><a href="https://data.krx.co.kr/inc/datasale/Market%20Data%20Usage%20Polices_ko.pdf?v=20230121_1" target="_blank" rel="noreferrer">{goldSourceTermsLabel[locale]}</a></li><li><a href="https://www.goldapi.io/kb/tos" target="_blank" rel="noreferrer">{copy.sourceApi}</a></li></ul><p>{copy.sourceNote}</p></article>
    </section>
  </>;
}

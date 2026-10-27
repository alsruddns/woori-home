import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { alternatesForLocales, isLocale, origin } from "@/lib/site";
import { guideLocales, guideUiCopy, guides, isGuideLocale } from "@/lib/data-platform/guides";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = guideUiCopy[locale];
  const url = `${origin}/${locale}/guides`;
  return { title: copy.title, description: copy.description, robots: { index: isGuideLocale(locale) && !(await searchParams).q, follow: true }, alternates: { canonical: url, languages: isGuideLocale(locale) ? alternatesForLocales("/guides", guideLocales, "en").languages : undefined }, openGraph: { type: "website", siteName: "WOORI.TODAY", title: copy.title, description: copy.description, url }, twitter: { card: "summary", title: copy.title, description: copy.description } };
}

export default async function GuidesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = guideUiCopy[locale];
  if (!isGuideLocale(locale)) return <section className="platform-empty-state guide-language-notice"><h1>{copy.unavailableTitle}</h1><p>{copy.unavailableBody}</p><div><Link href="/ko/guides">{copy.koreanVersion}</Link><Link href="/en/guides">{copy.englishVersion}</Link></div></section>;
  const requested = (await searchParams).q?.trim().slice(0, 100) ?? "";
  const normalized = requested.toLocaleLowerCase(locale);
  const visible = guides.filter((guide) => !normalized || `${guide.title[locale]} ${guide.summary[locale]} ${guide.category} ${guide.searchTerms[locale].join(" ")} ${guide.sections[locale].map((section) => `${section.heading} ${section.paragraphs.join(" ")}`).join(" ")}`.toLocaleLowerCase(locale).includes(normalized));
  const categories = { crypto: locale === "ko" ? "가상자산" : "Crypto", gold: locale === "ko" ? "금" : "Gold", economy: locale === "ko" ? "경제 통계" : "Economic statistics", "company-data": locale === "ko" ? "기업 재무" : "Company financials", research: locale === "ko" ? "연구 자료" : "Research records" };
  return <>
    <nav className="platform-breadcrumb" aria-label={copy.title}><Link href={`/${locale}`}>WOORI.TODAY</Link><span>/</span><span>{copy.title}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">WOORI.TODAY</span><h1>{copy.title}</h1><p>{copy.description}</p></header>
    <form className="guide-search" action={`/${locale}/guides`} method="get"><label htmlFor="guide-search-query">{copy.searchLabel}</label><div><input id="guide-search-query" type="search" name="q" defaultValue={requested} maxLength={100} /><button type="submit">{copy.searchButton}</button></div></form>
    <section className="guide-list" aria-label={copy.title}>
      {visible.map((guide) => <article className="guide-card" key={guide.slug}><span className="platform-eyebrow">{categories[guide.category]}</span><h2><Link href={`/${locale}/guides/${guide.slug}`}>{guide.title[locale]}</Link></h2><p>{guide.summary[locale]}</p><p className="guide-card-meta">{copy.reviewed}: <time dateTime={guide.reviewedAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${guide.reviewedAt}T00:00:00Z`))}</time></p><Link className="platform-home-link" href={`/${locale}/guides/${guide.slug}`}>{copy.readGuide}</Link></article>)}
      {!visible.length ? <p className="platform-empty-state">{copy.noResults}</p> : null}
    </section>
    <p className="platform-data-note">{copy.generalInfo}</p>
  </>;
}

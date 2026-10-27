import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { alternatesForLocales, isLocale, origin } from "@/lib/site";
import { getGuide, guideLocales, guideUiCopy, guides, isGuideLocale } from "@/lib/data-platform/guides";

export function generateStaticParams() { return guides.flatMap((guide) => ["ko", "en", "ja", "zh", "es", "pt-br", "de", "fr", "vi", "id", "th", "zh-tw", "it", "nl", "hi", "ru", "tr", "pl", "fil", "bn", "uk", "ms", "sv", "cs", "ro", "el"].map((locale) => ({ locale, slug: guide.slug }))); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: localeValue, slug } = await params;
  if (!isLocale(localeValue)) notFound();
  const guide = getGuide(slug);
  if (!guide) notFound();
  const locale = localeValue;
  const copy = guideUiCopy[locale];
  const publishedLocale = isGuideLocale(locale);
  const title = publishedLocale ? guide.title[locale] : copy.title;
  const description = publishedLocale ? guide.summary[locale] : copy.description;
  const url = `${origin}/${locale}/guides/${guide.slug}`;
  return { title, description, robots: { index: publishedLocale, follow: true }, alternates: { canonical: url, languages: publishedLocale ? alternatesForLocales(`/guides/${guide.slug}`, guideLocales, "en").languages : undefined }, openGraph: { type: "article", siteName: "WOORI.TODAY", title, description, url }, twitter: { card: "summary", title, description } };
}

export default async function GuideDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: localeValue, slug } = await params;
  if (!isLocale(localeValue)) notFound();
  const guide = getGuide(slug);
  if (!guide) notFound();
  const locale = localeValue;
  const copy = guideUiCopy[locale];
  if (!isGuideLocale(locale)) return <section className="platform-empty-state guide-language-notice"><h1>{copy.unavailableTitle}</h1><p>{copy.unavailableBody}</p><div><Link href={`/ko/guides/${guide.slug}`}>{copy.koreanVersion}</Link><Link href={`/en/guides/${guide.slug}`}>{copy.englishVersion}</Link></div></section>;
  const content = guide.sections[locale];
  const categoryLabel = { crypto: locale === "ko" ? "가상자산" : "Crypto", gold: locale === "ko" ? "금" : "Gold", economy: locale === "ko" ? "경제 통계" : "Economic statistics", "company-data": locale === "ko" ? "기업 재무" : "Company financials", research: locale === "ko" ? "연구 자료" : "Research records" }[guide.category];
  const pageUrl = `${origin}/${locale}/guides/${guide.slug}`;
  const schema = { "@context": "https://schema.org", "@type": "Article", headline: guide.title[locale], description: guide.summary[locale], datePublished: guide.createdAt, dateModified: guide.updatedAt, inLanguage: locale, mainEntityOfPage: pageUrl, publisher: { "@type": "Organization", name: "WOORI.TODAY", url: origin } };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <nav className="platform-breadcrumb" aria-label={copy.title}><Link href={`/${locale}/guides`}>{copy.title}</Link><span>/</span><span>{guide.title[locale]}</span></nav>
    <article className="guide-article">
      <header className="platform-page-heading"><span className="platform-eyebrow">{categoryLabel}</span><h1>{guide.title[locale]}</h1><p>{guide.summary[locale]}</p></header>
      <section className="guide-methodology"><p>{copy.generalInfo}</p><p>{copy.methodology}</p><dl><div><dt>{copy.created}</dt><dd><time dateTime={guide.createdAt}>{guide.createdAt}</time></dd></div><div><dt>{copy.updated}</dt><dd><time dateTime={guide.updatedAt}>{guide.updatedAt}</time></dd></div><div><dt>{copy.reviewed}</dt><dd><time dateTime={guide.reviewedAt}>{guide.reviewedAt}</time></dd></div></dl></section>
      <nav className="guide-toc" aria-label={copy.tableOfContents}><h2>{copy.tableOfContents}</h2><ol>{content.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.heading}</a></li>)}</ol></nav>
      <div className="guide-sections">{content.map((section) => <section id={section.id} key={section.id}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets ? <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul> : null}</section>)}</div>
      <section className="guide-related"><h2>{copy.related}</h2><ul>{guide.related.map((item) => <li key={item.href}><Link href={`/${locale}${item.href}`}>{item.label[locale]}</Link></li>)}</ul></section>
      <section className="guide-sources"><h2>{copy.sources}</h2><ul>{guide.sources[locale].map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a><span>{source.scope}</span></li>)}</ul></section>
      <p className="platform-data-note"><Link href={`/${locale}/guides`}>{copy.back}</Link></p>
    </article>
  </>;
}

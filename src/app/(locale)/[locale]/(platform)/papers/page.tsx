import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { alternates, isLocale, origin } from "@/lib/site";
import { researchCopy } from "@/lib/data-platform/research-copy";
import { filterResearchPapers } from "@/lib/data-platform/research-search";
import paperSnapshot from "@/data/research-papers.json";
import { hasPaperTitleTranslation, paperLocalizedTitle, type PaperTitleRecord } from "@/lib/data-platform/paper-title-localizations";
import { paperTitleCopy } from "@/lib/data-platform/paper-title-copy";
import { paperPublishedCopy } from "@/lib/data-platform/paper-published-copy";
import { PaperFilterForm } from "./paper-filter-form";
import { RelatedGuides } from "../../related-guides";
import { PortalEducationCards } from "../../portal-education-cards";

type Topic = keyof typeof researchCopy.en.topics;
type Paper = (typeof paperSnapshot.records)[number] & PaperTitleRecord;
const topics: Topic[] = ["ai", "medicine", "physics", "energy"];

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ topic?: string; sort?: string; q?: string; from?: string; to?: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const filters = await searchParams;
  const filtered = Boolean(filters.topic || filters.sort || filters.q || filters.from || filters.to);
  const publishedCopy = paperPublishedCopy[locale];
  const url = `${origin}/${locale}/papers`;
  return {
    title: publishedCopy.title,
    description: publishedCopy.description,
    robots: { index: !filtered, follow: true },
    alternates: { canonical: url, languages: alternates("/papers").languages },
    openGraph: { type: "website", siteName: "WOORI.TODAY", title: publishedCopy.title, description: publishedCopy.description, url },
    twitter: { card: "summary", title: publishedCopy.title, description: publishedCopy.description },
  };
}

export default async function ResearchPapersPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ topic?: string; sort?: string; q?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const requested = await searchParams;
  const topic = topics.includes(requested.topic as Topic) ? requested.topic as Topic : "all";
  const sort = requested.sort === "citations" ? "citations" : "recent";
  const copy = researchCopy[locale];
  const publishedCopy = paperPublishedCopy[locale];
  const titleCopy = paperTitleCopy[locale];
  const filtered = filterResearchPapers(paperSnapshot.records as Paper[], { topic, sort, query: requested.q, from: requested.from, to: requested.to, locale });
  const records = filtered.records;
  return <>
    <nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}`}>woori.today</Link><span>/</span><span>{publishedCopy.title}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">{copy.paperSource}</span><h1>{publishedCopy.title}</h1><p>{publishedCopy.description}</p></header>
    <section className="platform-summary"><div><span>{copy.updated}</span><strong>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${paperSnapshot.fetchedAt.slice(0, 10)}T00:00:00Z`))}</strong></div><div><span>{copy.paperSource}</span><strong>Crossref REST API</strong></div><div><span>{copy.field}</span><strong>{records.length}</strong></div></section>
    <PaperFilterForm locale={locale} topic={topic} sort={sort} query={requested.q?.slice(0, 120) ?? ""} fromDate={filtered.from ?? ""} />
    <p className="paper-metadata-notice">{copy.metadataNotice} {copy.noSummary}</p>
    <section className="paper-list" aria-label={publishedCopy.title}>
      {records.map((paper) => <article className="paper-card" key={paper.id}>
        <div className="paper-card-meta"><span>{copy.topics[paper.topic as Topic]}</span><time dateTime={paper.publishedAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${paper.publishedAt}T00:00:00Z`))}</time></div>
        <h2><Link href={`/${locale}/papers/${paper.id}`}>{paperLocalizedTitle(paper, locale)}</Link></h2>
        <p className="paper-title-translation-status">{hasPaperTitleTranslation(paper, locale) ? titleCopy.translationDraft : titleCopy.translationPending}</p>
        <p>{paper.authors.slice(0, 4).join(", ")}{paper.authors.length > 4 ? " et al." : ""}</p>
        <div className="paper-card-meta"><span>{paper.journal ?? copy.journal}</span><span>{copy.recentIndex}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${paper.indexedAt}T00:00:00Z`))}</span>{paper.citationCount !== null ? <span>{copy.citedFirst}: {new Intl.NumberFormat(locale).format(paper.citationCount)}</span> : null}</div>
      </article>)}
      {records.length === 0 ? <p className="platform-empty-state">{copy.noPapers}</p> : null}
    </section>
    <RelatedGuides locale={locale} slugs={["research-paper-dates-and-metadata"]} />
    <PortalEducationCards locale={locale} topic="papers" />
    <p className="platform-data-note">{copy.paperSource} · <a href="https://www.crossref.org/documentation/retrieve-metadata/rest-api/" target="_blank" rel="noreferrer">Crossref API guidance</a>. {copy.refreshNotice}</p>
  </>;
}

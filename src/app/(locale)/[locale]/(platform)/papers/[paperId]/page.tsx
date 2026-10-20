import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, origin } from "@/lib/site";
import { paperLicenseLabel, researchCopy } from "@/lib/data-platform/research-copy";
import paperSnapshot from "@/data/research-papers.json";

type Paper = (typeof paperSnapshot.records)[number];
const papers = paperSnapshot.records as Paper[];
export async function generateMetadata({ params }: { params: Promise<{ locale: string; paperId: string }> }): Promise<Metadata> {
  const { locale, paperId } = await params;
  if (!isLocale(locale)) notFound();
  const paper = papers.find((item) => item.id === paperId);
  if (!paper) notFound();
  const copy = researchCopy[locale];
  const url = `${origin}/${locale}/papers/${paper.id}`;
  return { title: paper.title, description: copy.metadataNotice, robots: { index: false, follow: true }, alternates: { canonical: url } };
}

export default async function ResearchPaperPage({ params }: { params: Promise<{ locale: string; paperId: string }> }) {
  const { locale, paperId } = await params;
  if (!isLocale(locale)) notFound();
  const paper = papers.find((item) => item.id === paperId);
  if (!paper) notFound();
  const copy = researchCopy[locale];
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  return <>
    <nav className="platform-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}/papers`}>{copy.papers}</Link><span>/</span><span>{paper.doi}</span></nav>
    <header className="platform-page-heading"><span className="platform-eyebrow">{copy.paperSource} · {copy.topics[paper.topic as keyof typeof copy.topics]}</span><h1>{paper.title}</h1><p>{copy.metadataNotice}</p></header>
    <section className="paper-detail">
      <dl><div><dt>{copy.authors}</dt><dd>{paper.authors.join(", ") || copy.unknown}</dd></div><div><dt>{copy.published}</dt><dd>{date(paper.publishedAt)}</dd></div><div><dt>{copy.journal}</dt><dd>{paper.journal ?? copy.unknown}</dd></div><div><dt>{copy.doi}</dt><dd><a href={`https://doi.org/${encodeURIComponent(paper.doi)}`} target="_blank" rel="noreferrer">{paper.doi}</a></dd></div></dl>
      <p>{paper.licenseUrls.length ? `${paperLicenseLabel[locale]}: ${paper.licenseUrls.join(", ")}` : copy.accessUnknown}</p>
      {paper.retracted ? <p role="alert">{copy.retractionNotice}</p> : null}
      <p>{copy.noSummary}</p>
      <a href={paper.url} target="_blank" rel="noreferrer">{copy.sourceLink}</a>
    </section>
  </>;
}

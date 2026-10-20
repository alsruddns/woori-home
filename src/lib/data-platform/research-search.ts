type SearchablePaper = {
  topic: string;
  title: string;
  doi: string;
  journal: string | null;
  authors: string[];
  publishedAt: string;
  indexedAt: string;
  citationCount: number | null;
  retracted: boolean;
};

export function validPaperDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
}

export function filterResearchPapers<T extends SearchablePaper>(records: T[], filters: {
  topic: string; sort: "recent" | "citations"; query?: string; from?: string; to?: string; locale: string;
}) {
  const query = filters.query?.trim().slice(0, 120).toLocaleLowerCase(filters.locale) ?? "";
  const from = validPaperDate(filters.from);
  const to = validPaperDate(filters.to);
  const filtered = records
    .filter((paper) => {
      const searchable = [paper.title, paper.doi, paper.journal ?? "", ...paper.authors].join(" ").toLocaleLowerCase(filters.locale);
      return !paper.retracted && (filters.topic === "all" || paper.topic === filters.topic) && (!query || searchable.includes(query)) && (!from || paper.publishedAt >= from) && (!to || paper.publishedAt <= to);
    })
    .sort((a, b) => filters.sort === "citations"
      ? (b.citationCount ?? -1) - (a.citationCount ?? -1) || b.publishedAt.localeCompare(a.publishedAt)
      : b.indexedAt.localeCompare(a.indexedAt) || b.publishedAt.localeCompare(a.publishedAt));
  return { records: filtered, from, to, query };
}

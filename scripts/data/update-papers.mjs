import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultOutput = resolve(root, "src/data/research-papers.json");
const topics = [
  { id: "ai", query: "artificial intelligence computing" },
  { id: "medicine", query: "medical biomedical life sciences" },
  { id: "physics", query: "physics astronomy" },
  { id: "energy", query: "energy environment" },
];
const dateFrom = (date) => {
  const parts = date?.["date-parts"]?.[0];
  if (!parts || parts.length < 3) return null;
  const value = `${String(parts[0]).padStart(4, "0")}-${String(parts[1]).padStart(2, "0")}-${String(parts[2]).padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
};
const stableId = (doi) => Buffer.from(doi.toLowerCase()).toString("base64url");
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function normalizeCrossrefItems(items, topic) {
  if (!Array.isArray(items)) throw new Error("Crossref message.items must be an array");
  const records = [];
  for (const item of items) {
    const doi = typeof item?.DOI === "string" ? item.DOI.trim() : "";
    const title = Array.isArray(item?.title) && typeof item.title[0] === "string" ? item.title[0].trim() : "";
    const publishedAt = dateFrom(item?.published ?? item?.["published-online"] ?? item?.["published-print"] ?? item?.issued);
    const indexedAt = dateFrom(item?.indexed);
    if (!doi || !title || !publishedAt || !indexedAt || !/^10\.\d{4,9}\//i.test(doi)) continue;
    const authors = Array.isArray(item.author)
      ? item.author.map((author) => [author.given, author.family].filter((part) => typeof part === "string" && part.trim()).join(" ")).filter(Boolean).slice(0, 12)
      : [];
    const licenseUrls = Array.isArray(item.license)
      ? [...new Set(item.license.map((entry) => entry?.URL).filter((url) => typeof url === "string" && /^https:\/\//.test(url)))].slice(0, 4)
      : [];
    const updates = Array.isArray(item["update-to"]) ? item["update-to"] : [];
    const retracted = updates.some((entry) => /retract|withdraw/i.test(`${entry?.type ?? ""} ${entry?.label ?? ""}`));
    records.push({
      id: stableId(doi), doi, title, topic,
      authors,
      publishedAt,
      indexedAt,
      journal: Array.isArray(item["container-title"]) && typeof item["container-title"][0] === "string" ? item["container-title"][0] : null,
      type: typeof item.type === "string" ? item.type : "unknown",
      url: typeof item.URL === "string" && item.URL.startsWith("https://") ? item.URL : `https://doi.org/${encodeURIComponent(doi)}`,
      citationCount: Number.isInteger(item["is-referenced-by-count"]) && item["is-referenced-by-count"] >= 0 ? item["is-referenced-by-count"] : null,
      licenseUrls,
      retracted,
    });
  }
  return records;
}

export async function collectPapers({ fetchImpl = fetch, now = new Date(), fixture } = {}) {
  const checkedAt = now.toISOString();
  const from = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const records = [];
  for (const topic of topics) {
    let items;
    if (fixture) {
      const fixturePayload = typeof fixture === "function" ? await fixture(topic.id) : fixture;
      items = fixturePayload?.message?.items ?? fixturePayload?.items;
    } else {
      const url = new URL("https://api.crossref.org/works");
      url.searchParams.set("filter", `from-index-date:${from},type:journal-article`);
      url.searchParams.set("query.title", topic.query);
      url.searchParams.set("sort", "indexed");
      url.searchParams.set("order", "desc");
      url.searchParams.set("rows", "12");
      url.searchParams.set("select", "DOI,title,author,published,published-online,created,indexed,container-title,type,URL,is-referenced-by-count,license,update-to");
      let response;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        response = await fetchImpl(url, { headers: { "User-Agent": "woori.today research index/1.0 (https://www.woori.today; bibliographic metadata)", Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
        if (response.ok) break;
        if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 3) throw new Error(`Crossref returned HTTP ${response.status} for topic ${topic.id}`);
        const retryAfter = Number(response.headers.get("retry-after"));
        await pause(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 20000) : 1500 * (attempt + 1));
      }
      const payload = await response.json();
      items = payload?.message?.items;
    }
    records.push(...normalizeCrossrefItems(items, topic.id));
    if (!fixture && topic !== topics.at(-1)) await pause(1500);
  }
  const unique = new Map();
  for (const record of records) {
    const existing = unique.get(record.doi.toLowerCase());
    if (!existing || (record.citationCount ?? -1) > (existing.citationCount ?? -1)) unique.set(record.doi.toLowerCase(), record);
  }
  const sorted = [...unique.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.doi.localeCompare(b.doi));
  if (!sorted.length) throw new Error("Crossref produced no validated journal article records");
  return { schemaVersion: 1, source: "Crossref REST API", sourceUrl: "https://api.crossref.org/works", license: "Crossref bibliographic metadata reuse guidance; abstracts excluded", fetchedAt: checkedAt, indexedSince: from, records: sorted };
}

export async function updatePapers({ output = defaultOutput, fetchImpl = fetch, now = new Date(), fixture } = {}) {
  const previousText = await readFile(output, "utf8").catch(() => null);
  const previous = previousText ? JSON.parse(previousText) : null;
  const next = await collectPapers({ fetchImpl, now, fixture });
  const comparable = (snapshot) => JSON.stringify({ schemaVersion: snapshot.schemaVersion, source: snapshot.source, sourceUrl: snapshot.sourceUrl, license: snapshot.license, records: snapshot.records });
  if (previous?.schemaVersion === 1 && comparable(previous) === comparable(next)) {
    console.log(`Research paper metadata unchanged (${next.records.length} records); retaining the existing file.`);
    return { changed: false, snapshot: previous };
  }
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(next)}\n`, "utf8");
  console.log(`Wrote ${next.records.length} validated Crossref records indexed since ${next.indexedSince}.`);
  return { changed: true, snapshot: next };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await updatePapers();
    if (!result.changed) process.exitCode = 0;
  } catch (error) {
    console.error("Research metadata refresh failed; the previous checked-in snapshot was retained.");
    throw error;
  }
}

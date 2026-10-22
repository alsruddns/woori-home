"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/site";
import { cryptoCopy } from "@/lib/data-platform/crypto-copy";
import { stockIssueCopy } from "@/lib/data-platform/market-issue-copy";
import cryptoIssues from "@/data/crypto-issues.json";
import stockIssues from "@/data/stock-issues.json";
import { validUtcDate } from "@/lib/data-platform/crypto-market.mjs";
import type { MarketIssue } from "@/lib/data-platform/crypto-market.mjs";
import { useTodayQueryDate } from "./use-today-query-date";

const translatedPending: Record<Locale, string> = {
  ru:"Источник проверяется",
  ko:"자료 제공처 검토 중", en:"Source review in progress", ja:"情報源を確認中", zh:"正在审核数据来源", es:"Fuente en revisión", "pt-br":"Fonte em análise", de:"Quelle wird geprüft", fr:"Source en cours de vérification", vi:"Đang xem xét nguồn", id:"Sumber sedang ditinjau", th:"อยู่ระหว่างตรวจสอบแหล่งข้อมูล", "zh-tw":"正在審核資料來源", it:"Fonte in verifica", nl:"Bron wordt gecontroleerd", hi:"स्रोत की समीक्षा जारी है",

  "tr": "Çeviri taslağı"
,
  "pl": "Projekt tłumaczenia"
,
  "fil": "Draft ng pagsasalin"
,
  "bn": "অনুবাদের খসড়া",
  "uk": "Чернетка перекладу"
,
  ms: "Comment"
};
const originalTitleLabels: Record<Locale, string> = {
  ru:"Оригинальное название",
  ko:"원문 제목", en:"Original title", ja:"原題", zh:"原文标题", es:"Título original", "pt-br":"Título original", de:"Originaltitel", fr:"Titre original", vi:"Tiêu đề gốc", id:"Judul asli", th:"ชื่อเรื่องต้นฉบับ", "zh-tw":"原文標題", it:"Titolo originale", nl:"Oorspronkelijke titel", hi:"मूल शीर्षक",

  "tr": "Özgün başlık"
,
  "pl": "Tytuł oryginalny"
,
  "fil": "Orihinal na pamagat"
,
  "bn": "মূল শিরোনাম",
  "uk": "Оригінальна назва"
,
  ms: "Judul asli"
};

export function MarketIssueExplorer({ locale, market }: { locale: Locale; market: "crypto" | "stocks" }) {
  const router = useRouter();
  const search = useSearchParams();
  const { selectedDate, today } = useTodayQueryDate();
  const date = search.get("date") ?? selectedDate;
  const crypto = market === "crypto";
  const copy = crypto ? cryptoCopy[locale] : null;
  const stock = crypto ? null : stockIssueCopy[locale];
  const dataset = crypto ? cryptoIssues : stockIssues;
  const rows = dataset.issues as MarketIssue[];
  const title = copy?.issueTitle ?? stock!.title;
  const description = copy?.issueDescription ?? stock!.description;
  const empty = copy?.emptyIssues ?? stock!.empty;
  const filteredRows = rows.filter((item) => !date || item.publishedAt.slice(0, 10) === date);

  function setDate(value: string) {
    if (value && (!validUtcDate(value) || value > today)) return;
    const params = new URLSearchParams(search.toString());
    if (value) params.set("date", value); else params.delete("date");
    const query = params.toString();
    router.push(`/${locale}/${crypto ? "crypto" : "stocks"}/issues${query ? `?${query}` : ""}`, { scroll: false });
  }

  const localeDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  return <>
    <header className="platform-page-heading"><span className="platform-eyebrow">{crypto ? copy!.nav : stock!.title}</span><h1>{title}</h1><p>{description}</p></header>
    <section className="market-issue-controls"><label><span>{copy?.issueDate ?? stock!.published}</span><input type="date" max={today} value={date && validUtcDate(date) && date <= today ? date : ""} onChange={(event) => setDate(event.target.value)} /></label></section>
    {filteredRows.length ? <div className="market-issue-list">{filteredRows.map((item) => {
      const localized = item.localizedTitles?.[locale];
      return <article key={`${item.sourceId}:${item.externalId ?? item.url}`}>
        <p>{localeDate(item.publishedAt.slice(0, 10))} · {item.sourceId}</p>
        <h2>{localized ?? item.originalTitle}</h2>
        {!localized ? <small className="market-issue-original-label">{originalTitleLabels[locale]}</small> : null}
        <a href={item.url} rel="noreferrer" target="_blank">{item.url}</a>
      </article>;
    })}</div> : <section className="crypto-empty-state" role="status"><h2>{empty}</h2><p>{copy?.source ?? stock!.source}: {translatedPending[locale]}</p>{date && validUtcDate(date) && date <= today ? <p>{copy?.issueDate ?? stock!.published}: {localeDate(date)}</p> : null}</section>}
  </>;
}

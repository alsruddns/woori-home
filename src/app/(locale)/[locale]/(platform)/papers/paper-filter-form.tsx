"use client";

import type { Locale } from "@/lib/site";
import { researchCopy, researchFilterCopy, researchApplyLabel } from "@/lib/data-platform/research-copy";
import { useTodayQueryDate } from "../../use-today-query-date";

const topics = ["ai", "medicine", "physics", "energy"] as const;
type Topic = (typeof topics)[number];

export function PaperFilterForm({ locale, topic, sort, query, fromDate }: { locale: Locale; topic: "all" | Topic; sort: "recent" | "citations"; query: string; fromDate: string }) {
  const copy = researchCopy[locale];
  const filterCopy = researchFilterCopy[locale];
  const { selectedDate, today } = useTodayQueryDate("to");

  return <form className="paper-filters" action={`/${locale}/papers`}>
    <label>{filterCopy.keywords}<input type="search" name="q" defaultValue={query} maxLength={120}/></label>
    <label>{copy.field}<select name="topic" defaultValue={topic}><option value="all">{copy.allFields}</option>{topics.map((item) => <option key={item} value={item}>{copy.topics[item]}</option>)}</select></label>
    <label>{copy.recentIndex}<select name="sort" defaultValue={sort}><option value="recent">{copy.recentFirst}</option><option value="citations">{copy.citedFirst}</option></select></label>
    <label>{filterCopy.fromDate}<input key={`from:${fromDate}`} type="date" name="from" max={today} defaultValue={fromDate}/></label>
    <label>{filterCopy.toDate}<input key={`to:${selectedDate}`} type="date" name="to" max={today} defaultValue={selectedDate}/></label>
    <button type="submit">{researchApplyLabel[locale]}</button>
  </form>;
}

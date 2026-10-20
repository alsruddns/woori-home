"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Locale } from "@/lib/site";
import type { IndicatorDefinition } from "@/lib/data-platform/model";
import { rankingCopy } from "@/lib/data-platform/ranking-copy";

export function RankingControls({ locale, indicators, years, selectedIndicator, selectedYear, selectedDirection }: {
  locale: Locale;
  indicators: Pick<IndicatorDefinition, "code" | "label">[];
  years: number[];
  selectedIndicator: string;
  selectedYear: number;
  selectedDirection: "asc" | "desc";
}) {
  const router = useRouter();
  const copy = rankingCopy[locale];
  const [indicator, setIndicator] = useState(selectedIndicator);
  const [year, setYear] = useState(String(selectedYear));
  const [direction, setDirection] = useState(selectedDirection);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams({ indicator, year, direction });
    router.push(`/${locale}/world?${params.toString()}`, { scroll: false });
  }

  return <form className="ranking-filters" onSubmit={submit}>
    <label>{copy.metric}<select name="indicator" value={indicator} onChange={(event) => setIndicator(event.target.value)}>{indicators.map((item) => <option key={item.code} value={item.code}>{item.label[locale] ?? item.label.en}</option>)}</select></label>
    <label>{copy.year}<select name="year" value={year} onChange={(event) => setYear(event.target.value)}>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    <label>{copy.direction}<select name="direction" value={direction} onChange={(event) => setDirection(event.target.value as "asc" | "desc")}><option value="desc">{copy.high}</option><option value="asc">{copy.low}</option></select></label>
    <button type="submit">{copy.apply}</button>
  </form>;
}

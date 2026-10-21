"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/site";
import { DatePicker } from "../../date-picker";
import { useSnapshotQueryDate } from "../../use-snapshot-query-date";

export function GoldUnavailableDate({ locale, label, emptyText }: { locale: Locale; label: string; emptyText: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const { today, selectedDate } = useSnapshotQueryDate("Asia/Seoul", []);
  function chooseDate(date: string) {
    const query = new URLSearchParams(search.toString());
    if (date) query.set("date", date);
    else query.delete("date");
    router.push(`/${locale}/gold${query.size ? `?${query.toString()}` : ""}`, { scroll: false });
  }
  return <div className="gold-unavailable-date"><label>{label}<DatePicker locale={locale} label={label} value={selectedDate} max={today} onChange={chooseDate} /></label>{selectedDate ? <p>{selectedDate} · {emptyText}</p> : null}</div>;
}

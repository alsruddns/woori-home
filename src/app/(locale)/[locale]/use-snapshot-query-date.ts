"use client";

import { useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { isCalendarDate } from "@/lib/date-query.mjs";
import { defaultSnapshotDate } from "@/lib/snapshot-date.mjs";

export function useSnapshotQueryDate(timeZone: string, availableDates: string[] = [], queryKey = "date") {
  const search = useSearchParams();
  const queryDate = search.get(queryKey);
  const hasValidQueryDate = isCalendarDate(queryDate);
  const fallback = useSyncExternalStore(noopSubscribe, () => defaultSnapshotDate(new Date(), timeZone, availableDates), () => "");
  return { today: fallback || "", selectedDate: hasValidQueryDate ? queryDate : fallback, queryDate };
}

function noopSubscribe() { return () => {}; }

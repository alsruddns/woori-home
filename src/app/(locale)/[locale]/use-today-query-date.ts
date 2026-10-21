"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isCalendarDate, localCalendarDate } from "@/lib/date-query.mjs";

export function useTodayQueryDate(queryKey = "date") {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const queryString = search.toString();
  const queryDate = search.get(queryKey);
  const hasValidQueryDate = isCalendarDate(queryDate);
  const today = useSyncExternalStore(noopSubscribe, getLocalToday, getServerToday);

  useEffect(() => {
    const currentToday = localCalendarDate(new Date());
    if (!hasValidQueryDate) {
      const query = new URLSearchParams(queryString);
      query.set(queryKey, currentToday);
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    }
  }, [hasValidQueryDate, pathname, queryKey, queryString, router]);

  return { today, selectedDate: hasValidQueryDate ? queryDate : today, queryDate };
}

function noopSubscribe() {
  return () => {};
}

function getLocalToday() {
  return localCalendarDate(new Date());
}

function getServerToday() {
  return "";
}

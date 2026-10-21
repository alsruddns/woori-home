"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/site";
import { scienceCopy, scienceFields } from "@/lib/data-platform/science-copy";
import { useTodayQueryDate } from "./use-today-query-date";
import { DatePicker } from "./date-picker";

export type NeoObject = {
  id: string;
  name: string;
  closeApproachDate: string;
  estimatedDiameterMinM: number;
  estimatedDiameterMaxM: number;
  missDistanceKm: number;
  relativeVelocityKmS: number;
  potentiallyHazardous: boolean;
  nasaUrl: string;
};

const number = (value: number, locale: Locale, digits = 1) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
export function ScienceDateExplorer({ locale, dates: rawDates, objects, fetchedAt }: { locale: Locale; dates: string[]; objects: NeoObject[]; fetchedAt: string }) {
  const copy = scienceCopy[locale];
  const dates = rawDates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
  const { today, selectedDate } = useTodayQueryDate();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const selected = dates.includes(selectedDate) ? selectedDate : null;
  const selectedObjects = selected ? objects.filter((object) => object.closeApproachDate === selected) : [];
  const position = selected ? dates.indexOf(selected) : -1;
  const earlierDate = dates.filter((date) => date < selectedDate).at(-1);
  const laterDate = dates.find((date) => date > selectedDate);
  const selectedLabel = selected ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${selected}T00:00:00Z`)) : "";
  const localeDate = (date: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  function chooseDate(date: string) {
    const query = new URLSearchParams(search.toString());
    query.set("date", date);
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  }

  return <>
    <section className="platform-summary"><div><span>{copy.facts}</span><strong>{selectedObjects.length}</strong></div><div><span>{copy.date}</span><strong>{selectedLabel || selectedDate || copy.noData}</strong></div><div><span>{copy.latest}</span><strong>{dates.at(-1) ? localeDate(dates.at(-1)!) : copy.noData}</strong></div></section>
    <section className="platform-indicator-section"><div className="platform-section-heading"><div><span className="platform-eyebrow">{copy.date}</span><h2>{copy.facts}</h2></div></div>
      <label className="science-date-form"><span>{copy.date}</span><DatePicker locale={locale} id="science-date" label={copy.date} value={selectedDate} today={today} max={today} availableDates={dates} onChange={chooseDate} /></label>
      <nav className="science-date-navigation" aria-label={copy.date}>
        {position > 0 ? <Link href={`${pathname}?date=${encodeURIComponent(dates[position - 1])}`}>{copy.previous}: {dates[position - 1]}</Link> : earlierDate ? <Link href={`${pathname}?date=${encodeURIComponent(earlierDate)}`}>{copy.previous}: {earlierDate}</Link> : <span aria-disabled="true">{copy.previous}</span>}
        {position >= 0 && position < dates.length - 1 ? <Link href={`${pathname}?date=${encodeURIComponent(dates[position + 1])}`}>{copy.next}: {dates[position + 1]}</Link> : laterDate ? <Link href={`${pathname}?date=${encodeURIComponent(laterDate)}`}>{copy.next}: {laterDate}</Link> : <span aria-disabled="true">{copy.next}</span>}
      </nav>
      {!selected || selectedObjects.length === 0 ? <div className="platform-empty-state"><strong>{copy.noData}</strong></div> : <div className="neo-grid">{selectedObjects.map((object) => <article className="neo-card" key={`${object.id}-${object.closeApproachDate}`}>
        <div className="neo-card-heading"><h3>{object.name}</h3><span>{localeDate(object.closeApproachDate)}</span></div>
        <dl><div><dt>{scienceFields[locale][0]}</dt><dd>{number(object.missDistanceKm, locale)} km</dd></div><div><dt>{scienceFields[locale][1]}</dt><dd>{number(object.estimatedDiameterMinM, locale)}–{number(object.estimatedDiameterMaxM, locale)} m</dd></div><div><dt>{scienceFields[locale][2]}</dt><dd>{number(object.relativeVelocityKmS, locale, 2)} km/s</dd></div></dl>
        <p className={object.potentiallyHazardous ? "neo-risk" : "neo-normal"}>{scienceFields[locale][object.potentiallyHazardous ? 3 : 4]}</p>
        <a href={object.nasaUrl} target="_blank" rel="noreferrer">NASA JPL</a>
      </article>)}</div>}
      <p className="platform-data-note">{copy.updated}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(fetchedAt))} UTC</p>
    </section>
  </>;
}

export function ScienceDateExplorerLoading({ locale }: { locale: Locale }) {
  return <section className="platform-empty-state"><h2>{scienceCopy[locale].facts}</h2><p>{scienceCopy[locale].noData}</p></section>;
}

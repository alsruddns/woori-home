"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Locale } from "@/lib/site";
import { datePickerCopy } from "@/lib/date-picker-copy";

type Props = { locale: Locale; label: string; value: string; onChange: (value: string) => void; max?: string; min?: string; today?: string; availableDates?: string[]; id?: string; name?: string };
const weekdayStart: Partial<Record<Locale, number>> = { en: 0, zh: 0, "zh-tw": 0, ja: 0, th: 0, hi: 0 ,
  uk: 0
,
  ms: 0
};
const parseDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]) ? date : null;
};
const isoDate = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export function DatePicker({ locale, label, value, onChange, max, min, today, availableDates = [], id, name }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const initial = parseDate(value) ?? parseDate(max ?? "") ?? new Date(Date.UTC(2026, 0, 1));
    return new Date(Date.UTC(initial.getUTCFullYear(), initial.getUTCMonth(), 1));
  });
  const root = useRef<HTMLDivElement>(null);
  const valueButton = useRef<HTMLButtonElement>(null);
  const iconButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const available = useMemo(() => new Set(availableDates), [availableDates]);
  const copy = datePickerCopy[locale];
  const selected = parseDate(value);
  const formatted = selected ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(selected) : value;
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }), [locale]);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(month);
  const firstDay = weekdayStart[locale] ?? 1;
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const day = (firstDay + index) % 7;
    return formatter.format(new Date(Date.UTC(2023, 0, 1 + day)));
  });
  const year = month.getUTCFullYear();
  const monthNumber = month.getUTCMonth();
  const offset = (new Date(Date.UTC(year, monthNumber, 1)).getUTCDay() - firstDay + 7) % 7;
  const dayCount = new Date(Date.UTC(year, monthNumber + 1, 0)).getUTCDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: dayCount }, (_, index) => index + 1)];
  while (cells.length % 7) cells.push(null);

  useEffect(() => {
    if (!open) return;
    const focusDay = requestAnimationFrame(() => {
      root.current?.querySelector<HTMLButtonElement>(".shared-date-picker-popover td button[aria-pressed='true'], .shared-date-picker-popover td button[data-today='true'], .shared-date-picker-popover td button:not(:disabled)")?.focus();
    });
    const onPointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        requestAnimationFrame(() => opener.current?.focus());
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(focusDay); document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function choose(day: number) {
    const date = isoDate(year, monthNumber, day);
    if ((min && date < min) || (max && date > max)) return;
    onChange(date);
    setOpen(false);
    requestAnimationFrame(() => opener.current?.focus());
  }

  function chooseToday() {
    if (!today || (min && today < min) || (max && today > max)) return;
    onChange(today);
    setMonth(new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1)));
    setOpen(false);
    requestAnimationFrame(() => opener.current?.focus());
  }

  function focusAdjacentDay(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const movement = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" ? -7 : event.key === "ArrowDown" ? 7 : 0;
    if (!movement) return;
    event.preventDefault();
    const buttons = [...(root.current?.querySelectorAll<HTMLButtonElement>(".shared-date-picker-popover td button:not(:disabled)") ?? [])];
    const next = buttons[buttons.indexOf(event.currentTarget) + movement];
    if (next) next.focus();
  }

  return <div className="shared-date-picker" ref={root}>
    {name ? <input type="hidden" name={name} value={value} /> : null}
    <div className="shared-date-picker-trigger">
      <button ref={valueButton} id={id} type="button" className="shared-date-picker-value" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => { opener.current = valueButton.current; const visible = selected ?? parseDate(max ?? "") ?? new Date(); setMonth(new Date(Date.UTC(visible.getUTCFullYear(), visible.getUTCMonth(), 1))); setOpen(true); }}>{formatted || label}</button>
      <button ref={iconButton} type="button" className="shared-date-picker-icon" aria-label={copy.calendar} aria-haspopup="dialog" aria-expanded={open} onClick={() => { opener.current = iconButton.current; const visible = selected ?? parseDate(max ?? "") ?? new Date(); setMonth(new Date(Date.UTC(visible.getUTCFullYear(), visible.getUTCMonth(), 1))); setOpen(true); }}><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="4" width="15" height="13" rx="2"/><path d="M6 2.5v3M14 2.5v3M3 8h14"/></svg></button>
    </div>
    {open ? <section className="shared-date-picker-popover" role="dialog" aria-label={label}>
      <header><button type="button" aria-label={copy.previousMonth} onClick={() => setMonth(new Date(Date.UTC(year, monthNumber - 1, 1)))}>&larr;</button><strong>{monthLabel}</strong><button type="button" aria-label={copy.nextMonth} onClick={() => setMonth(new Date(Date.UTC(year, monthNumber + 1, 1)))}>&rarr;</button></header>
      <table><thead><tr>{weekdayLabels.map((day, index) => <th key={`${day}-${index}`} scope="col">{day}</th>)}</tr></thead><tbody>{Array.from({ length: cells.length / 7 }, (_, row) => <tr key={row}>{cells.slice(row * 7, row * 7 + 7).map((day, col) => {
        if (day === null) return <td key={col} />;
        const date = isoDate(year, monthNumber, day);
        const disabled = Boolean((min && date < min) || (max && date > max));
        return <td key={col}><button type="button" className={available.has(date) ? "has-data" : undefined} data-today={date === today ? "true" : undefined} disabled={disabled} aria-label={new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }).format(parseDate(date)!)} aria-pressed={value === date} onKeyDown={focusAdjacentDay} onClick={() => choose(day)}>{day}</button></td>;
      })}</tr>)}</tbody></table>
      {today ? <button type="button" className="shared-date-picker-today" disabled={Boolean((min && today < min) || (max && today > max))} onClick={chooseToday}>{copy.today}</button> : null}
      <button type="button" className="shared-date-picker-close" onClick={() => { setOpen(false); requestAnimationFrame(() => opener.current?.focus()); }}>{copy.close}</button>
    </section> : null}
  </div>;
}

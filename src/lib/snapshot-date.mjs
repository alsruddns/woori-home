export function calendarDateInZone(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function previousCalendarDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const [year, month, day] = date.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}-${String(previous.getUTCDate()).padStart(2, "0")}`;
}

export function defaultSnapshotDate(now, timeZone, availableDates = []) {
  const yesterday = previousCalendarDate(calendarDateInZone(now, timeZone));
  return availableDates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= yesterday).sort().at(-1) ?? yesterday;
}

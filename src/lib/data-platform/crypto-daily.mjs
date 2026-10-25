const DAY_MS = 86_400_000;

function partsAt(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const read = (type) => parts.find((part) => part.type === type)?.value;
  return { date: `${read("year")}-${read("month")}-${read("day")}`, hour: Number(read("hour")) };
}

export function previousDailyReferenceDate(now = new Date(), timeZone = "Asia/Seoul") {
  const { date } = partsAt(now, timeZone);
  return new Date(Date.parse(`${date}T00:00:00.000Z`) - DAY_MS).toISOString().slice(0, 10);
}

export function isDailySnapshotReady(now = new Date(), timeZone = "Asia/Seoul", availableAfterHour = 10) {
  const { hour } = partsAt(now, timeZone);
  return hour >= availableAfterHour;
}

export function adjacentCalendarDate(referenceDate) {
  const date = new Date(`${referenceDate}T00:00:00.000Z`);
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== referenceDate) return null;
  return new Date(date.valueOf() - DAY_MS).toISOString().slice(0, 10);
}

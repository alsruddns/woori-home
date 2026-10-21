export type StockDateStatus = "available" | "invalid" | "future" | "weekend" | "missing" | "empty";

export function isValidStockDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function classifyStockDate(availableDates: readonly string[], selectedDate: string, today: string): StockDateStatus {
  if (availableDates.length === 0) return "empty";
  if (!isValidStockDate(selectedDate)) return "invalid";
  if (selectedDate > today) return "future";
  if (availableDates.includes(selectedDate)) return "available";
  const weekday = new Date(`${selectedDate}T00:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6 ? "weekend" : "missing";
}

export function adjacentAvailableDates(availableDates: readonly string[], selectedDate: string) {
  const sorted = [...availableDates].sort();
  return {
    previous: sorted.filter((date) => date < selectedDate).at(-1),
    next: sorted.find((date) => date > selectedDate),
  };
}

export function previousDailyReferenceDate(now?: Date, timeZone?: string): string;
export function isDailySnapshotReady(now?: Date, timeZone?: string, availableAfterHour?: number): boolean;
export function adjacentCalendarDate(referenceDate: string): string | null;

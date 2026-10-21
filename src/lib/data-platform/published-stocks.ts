import type { StockMarketId } from "./registry";
import type { StockSnapshot } from "./registry";

// No stock quote source has cleared public display and storage rights yet.
export function snapshotDatesForMarket(market: StockMarketId): string[] { void market; return []; }
export function stockSnapshotForDate(market: StockMarketId, date: string): StockSnapshot | undefined { void market; void date; return undefined; }

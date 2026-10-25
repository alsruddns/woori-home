export type FinancialCacheState = "HIT" | "MISS" | "STALE";
export function createFinancialResponseCache(options?: { maxEntries?: number; maxBytes?: number; ttlMs?: number; staleMs?: number; now?: () => number }): {
  get<T>(key: string, loader: () => Promise<T> | T): Promise<{ value: T; state: FinancialCacheState }>;
  clear(): void;
};
export function secFactsCacheVersion(status: unknown): string;

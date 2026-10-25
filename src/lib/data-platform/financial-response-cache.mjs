const DEFAULT_MAX_ENTRIES = 32;
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const DEFAULT_TTL_MS = 60_000;
const DEFAULT_STALE_MS = 5 * 60_000;

export function createFinancialResponseCache({
  maxEntries = DEFAULT_MAX_ENTRIES,
  maxBytes = DEFAULT_MAX_BYTES,
  ttlMs = DEFAULT_TTL_MS,
  staleMs = DEFAULT_STALE_MS,
  now = Date.now,
} = {}) {
  const entries = new Map();
  let bytes = 0;

  function remove(key) {
    const entry = entries.get(key);
    if (entry) bytes -= entry.bytes;
    entries.delete(key);
  }

  function prune() {
    while (entries.size > maxEntries || bytes > maxBytes) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      remove(oldest);
    }
  }

  return {
    async get(key, loader) {
      const time = now();
      const existing = entries.get(key);
      if (existing?.promise) return { value: await existing.promise, state: "MISS" };
      if (existing && existing.expiresAt > time) {
        entries.delete(key);
        entries.set(key, existing);
        return { value: existing.value, state: "HIT" };
      }

      const stale = existing && existing.staleUntil > time ? existing : null;
      const promise = Promise.resolve().then(loader);
      entries.delete(key);
      entries.set(key, { ...(stale ?? {}), promise, bytes: stale?.bytes ?? 0 });
      prune();
      try {
        const value = await promise;
        let size;
        try {
          const serialized = JSON.stringify(value);
          size = typeof serialized === "string" ? Buffer.byteLength(serialized, "utf8") : 0;
        } catch {
          remove(key);
          return { value, state: "MISS" };
        }
        if (size <= maxBytes) {
          remove(key);
          entries.set(key, { value, bytes: size, expiresAt: now() + ttlMs, staleUntil: now() + ttlMs + staleMs });
          bytes += size;
          prune();
        } else {
          remove(key);
        }
        return { value, state: "MISS" };
      } catch (error) {
        if (stale) {
          entries.set(key, stale);
          return { value: stale.value, state: "STALE" };
        }
        remove(key);
        throw error;
      }
    },
    clear() {
      entries.clear();
      bytes = 0;
    },
  };
}

export const secFactsCacheVersion = (status) => JSON.stringify([
  status?.lastRunStatus ?? null,
  status?.lastRunStartedAt instanceof Date ? status.lastRunStartedAt.toISOString() : status?.lastRunStartedAt ?? null,
  status?.lastRunFinishedAt instanceof Date ? status.lastRunFinishedAt.toISOString() : status?.lastRunFinishedAt ?? null,
  status?.lastSuccessAt instanceof Date ? status.lastSuccessAt.toISOString() : status?.lastSuccessAt ?? null,
  status?.recordCount ?? null,
  status?.insertedCount ?? null,
  status?.updatedCount ?? null,
]);

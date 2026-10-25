function retryDelay(response) {
  if (response.status !== 429) return null;
  const value = response.headers.get("retry-after");
  if (!value || !/^\d+$/.test(value.trim())) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 1 && seconds <= 60 ? seconds * 1000 : null;
}

function waitForRetry(milliseconds, signal) {
  if (signal?.aborted) return Promise.reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

const SESSION_CACHE_PREFIX = "woori:sec-company-facts:v1:";
const SESSION_CACHE_TTL_MS = 120_000;
const SESSION_CACHE_MAX_ENTRIES = 8;
const SESSION_CACHE_MAX_ENTRY_CHARS = 512_000;
const SESSION_CACHE_MAX_TOTAL_CHARS = 1_500_000;

function getSessionStorage() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function cachedResponse(body) {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=120, stale-while-revalidate=60",
      "x-financial-cache": "SESSION",
    },
  });
}

function readSessionCache(storage, key, now) {
  if (!storage) return null;
  try {
    const value = storage.getItem(key);
    if (!value) return null;
    const entry = JSON.parse(value);
    if (typeof entry.body !== "string" || !Number.isFinite(entry.expiresAt) || entry.expiresAt <= now) {
      storage.removeItem(key);
      return null;
    }
    return cachedResponse(entry.body);
  } catch {
    return null;
  }
}

function writeSessionCache(storage, key, body, now) {
  if (!storage || body.length > SESSION_CACHE_MAX_ENTRY_CHARS) return;
  try {
    const entries = [];
    for (let index = 0; index < storage.length; index += 1) {
      const candidateKey = storage.key(index);
      if (!candidateKey?.startsWith(SESSION_CACHE_PREFIX)) continue;
      try {
        const entry = JSON.parse(storage.getItem(candidateKey));
        if (!entry || typeof entry.body !== "string" || !Number.isFinite(entry.expiresAt) || entry.expiresAt <= now) {
          storage.removeItem(candidateKey);
          index -= 1;
          continue;
        }
        entries.push({ key: candidateKey, bodyLength: entry.body.length, storedAt: Number(entry.storedAt) || 0 });
      } catch {
        storage.removeItem(candidateKey);
        index -= 1;
      }
    }
    let count = entries.length;
    let totalChars = entries.reduce((sum, entry) => sum + entry.bodyLength, 0);
    entries.sort((left, right) => left.storedAt - right.storedAt);
    while (count >= SESSION_CACHE_MAX_ENTRIES || totalChars + body.length > SESSION_CACHE_MAX_TOTAL_CHARS) {
      const oldest = entries.shift();
      if (!oldest) break;
      storage.removeItem(oldest.key);
      count -= 1;
      totalChars -= oldest.bodyLength;
    }
    storage.setItem(key, JSON.stringify({ body, storedAt: now, expiresAt: now + SESSION_CACHE_TTL_MS }));
  } catch {
    // Quota limits and disabled storage must not prevent the SEC endpoint from working.
  }
}

export async function fetchCompanyFacts(url, { signal, fetchImpl = fetch, wait = waitForRetry, storage = getSessionStorage(), now = Date.now } = {}) {
  const cacheKey = `${SESSION_CACHE_PREFIX}${url}`;
  const timestamp = now();
  const cached = readSessionCache(storage, cacheKey, timestamp);
  if (cached) return cached;

  const response = await fetchImpl(url, { cache: "default", signal });
  const delay = retryDelay(response);
  let finalResponse = response;
  if (delay !== null) {
    await wait(delay, signal);
    if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
    finalResponse = await fetchImpl(url, { cache: "no-store", signal });
  }
  if (finalResponse.ok && finalResponse.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = await finalResponse.clone().text();
      JSON.parse(body);
      writeSessionCache(storage, cacheKey, body, now());
    } catch {
      // Response caching is best-effort; the caller still receives the original response.
    }
  }
  return finalResponse;
}

function retryDelay(response, now = Date.now()) {
  if (response.status !== 429) return null;
  const value = response.headers.get("retry-after");
  if (!value) return null;
  if (/^\d+$/.test(value.trim())) {
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds >= 1 ? seconds * 1000 : null;
  }
  const retryAt = Date.parse(value);
  return Number.isFinite(retryAt) ? Math.max(0, retryAt - now) : null;
}

function wait(milliseconds, signal) {
  if (signal?.aborted) return Promise.reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const onAbort = () => { clearTimeout(timer); signal?.removeEventListener("abort", onAbort); reject(signal?.reason ?? new DOMException("Aborted", "AbortError")); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Retry one 429 response only after the server's Retry-After time. */
export async function fetchRespectingRetryAfter(url, { fetchImpl = fetch, signal, waitImpl = wait, now = Date.now } = {}) {
  let response = await fetchImpl(url, { cache: "no-store", signal });
  const delay = retryDelay(response, now());
  if (delay === null) return response;
  await waitImpl(delay, signal);
  if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
  response = await fetchImpl(url, { cache: "no-store", signal });
  return response;
}

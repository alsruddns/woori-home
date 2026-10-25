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

export async function fetchCompanyFacts(url, { signal, fetchImpl = fetch, wait = waitForRetry } = {}) {
  const response = await fetchImpl(url, { cache: "default", signal });
  const delay = retryDelay(response);
  if (delay === null) return response;
  await wait(delay, signal);
  if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
  return fetchImpl(url, { cache: "no-store", signal });
}

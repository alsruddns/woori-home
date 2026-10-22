const requestsByClient = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;
const MAX_CLIENTS = 2_048;

export function allowFinancialRequest(clientId, now = Date.now()) {
  const key = typeof clientId === "string" && clientId.trim() ? clientId.slice(0, 80) : "anonymous";
  for (const [id, bucket] of requestsByClient) if (now - bucket.startedAt >= WINDOW_MS) requestsByClient.delete(id);
  let bucket = requestsByClient.get(key);
  if (!bucket || now - bucket.startedAt >= WINDOW_MS) bucket = { startedAt: now, count: 0 };
  bucket.count += 1;
  requestsByClient.delete(key);
  requestsByClient.set(key, bucket);
  while (requestsByClient.size > MAX_CLIENTS) requestsByClient.delete(requestsByClient.keys().next().value);
  return { allowed: bucket.count <= MAX_REQUESTS, retryAfterSeconds: Math.max(1, Math.ceil((bucket.startedAt + WINDOW_MS - now) / 1000)) };
}

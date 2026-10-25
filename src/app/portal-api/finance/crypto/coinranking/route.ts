import { createCoinrankingProvider } from "@/lib/data-platform/providers/coinranking.mjs";
import { financialRateLimit } from "@/lib/data-platform/financial-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff" };
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(body, { status, headers: { ...noStore, ...headers } });
type CoinrankingQuotePayload = { provider: string; sourceUrl: string; attribution: string; currency: string; quoteType: string; observedAt: string; data: Array<Record<string, unknown>> };
const QUOTE_TTL_MS = 5 * 60 * 1000;
let cachedQuotes: { expiresAt: number; value: CoinrankingQuotePayload } | null = null;
let quoteRefresh: Promise<CoinrankingQuotePayload> | null = null;

function accessGate() {
  if (!process.env.COINRANKING_API_KEY) return "provider-not-configured";
  if (process.env.COINRANKING_PUBLIC_DISPLAY_APPROVED !== "true" || process.env.COINRANKING_USER_API_APPROVED !== "true" || process.env.COINRANKING_COMPETITOR_PERMISSION_CONFIRMED !== "true" || process.env.COINRANKING_DERIVED_VISUALIZATION_APPROVED !== "true" || process.env.COINRANKING_TEMP_CACHE_APPROVED !== "true") return "provider-rights-pending";
  return null;
}

export async function GET(request: Request) {
  const limited = financialRateLimit(request);
  if (limited) return limited;
  const blocked = accessGate();
  if (blocked) return json({ error: blocked, data: [], source: "Coinranking", attribution: "Data provided by Coinranking" }, 503);

  try {
    const now = Date.now();
    if (cachedQuotes && cachedQuotes.expiresAt > now) return json(cachedQuotes.value, 200, { "x-market-source": "coinranking", "x-market-cache": "hit" });
    quoteRefresh ??= createCoinrankingProvider().fetchQuotes({ signal: AbortSignal.timeout(10000) }).then((payload) => {
      cachedQuotes = { value: payload, expiresAt: Date.now() + QUOTE_TTL_MS };
      return payload;
    }).finally(() => { quoteRefresh = null; });
    const payload = await quoteRefresh;
    return json(payload, 200, { "x-market-source": "coinranking", "x-market-cache": "miss" });
  } catch (error) {
    const status = Number((error as { status?: number }).status);
    if (status === 429) {
      const retry = Number((error as { retryAfterSeconds?: number }).retryAfterSeconds);
      return json({ error: "provider-rate-limited", data: [] }, 429, retry > 0 ? { "retry-after": String(Math.ceil(retry)) } : {});
    }
    console.error("Coinranking quote request failed", status || "network-error");
    return json({ error: status === 401 || status === 403 ? "provider-authentication-failed" : "provider-unavailable", data: [] }, 502);
  }
}

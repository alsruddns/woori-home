import { createCoinrankingProvider } from "@/lib/data-platform/providers/coinranking.mjs";
import { financialRateLimit } from "@/lib/data-platform/financial-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore });
const periods = new Set(["7d", "30d", "3m", "1y"]);
const DAILY_HISTORY_UPSTREAM_BUDGET = 4;
const historyCache = new Map<string, { expiresAt: number; data: Array<{ timestamp: string; price: string }> }>();
let historyBudgetDate = "";
let historyRequestsToday = 0;
let historyInFlight = 0;

export async function GET(request: Request, context: { params: Promise<{ uuid: string }> }) {
  const limited = financialRateLimit(request);
  if (limited) return limited;
  if (!process.env.COINRANKING_API_KEY) return json({ error: "provider-not-configured", data: [] }, 503);
  if (process.env.COINRANKING_PUBLIC_DISPLAY_APPROVED !== "true" || process.env.COINRANKING_USER_API_APPROVED !== "true" || process.env.COINRANKING_COMPETITOR_PERMISSION_CONFIRMED !== "true" || process.env.COINRANKING_CHARTS_APPROVED !== "true" || process.env.COINRANKING_TEMP_CACHE_APPROVED !== "true") return json({ error: "provider-rights-pending", data: [] }, 503);

  const { uuid } = await context.params;
  const period = new URL(request.url).searchParams.get("period") ?? "7d";
  if (!periods.has(period)) return json({ error: "invalid-period", data: [] }, 400);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (historyBudgetDate !== today) { historyBudgetDate = today; historyRequestsToday = 0; historyInFlight = 0; }
  const key = `${uuid}:${period}`;
  const cached = historyCache.get(key);
  if (cached && cached.expiresAt > now.getTime()) return json({ data: cached.data, source: "Coinranking", attribution: "Data provided by Coinranking", period, currency: "USD", cached: true });
  if (historyRequestsToday + historyInFlight >= DAILY_HISTORY_UPSTREAM_BUDGET) return json({ error: "daily-provider-history-budget-exhausted", data: [] }, 429);
  historyInFlight += 1;
  historyRequestsToday += 1;
  try {
    const data = await createCoinrankingProvider().fetchPriceHistory(uuid, period, { signal: request.signal });
    historyCache.set(key, { data, expiresAt: Date.now() + 6 * 60 * 60 * 1000 });
    return json({ data, source: "Coinranking", attribution: "Data provided by Coinranking", period, currency: "USD", cached: false });
  } catch (error) {
    const status = Number((error as { status?: number }).status);
    if (status === 429) return json({ error: "provider-rate-limited", data: [] }, 429);
    console.error("Coinranking history request failed", status || "network-error");
    return json({ error: status ? "provider-request-failed" : "provider-unavailable", data: [] }, status === 400 ? 400 : 502);
  } finally {
    historyInFlight = Math.max(0, historyInFlight - 1);
  }
}

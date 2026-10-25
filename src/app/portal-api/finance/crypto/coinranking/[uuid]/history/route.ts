import { getCoinrankingDailyHistory } from "@/lib/db/financial-queries";
import { financialRateLimit } from "@/lib/data-platform/financial-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = { "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff" };
const periods = new Set(["7d", "30d", "3m", "1y"] as const);

export async function GET(request: Request, context: { params: Promise<{ uuid: string }> }) {
  const limited = financialRateLimit(request);
  if (limited) return limited;
  const { uuid } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(uuid)) return Response.json({ error: "invalid-asset", data: [] }, { status: 400, headers });
  const period = new URL(request.url).searchParams.get("period") ?? "7d";
  if (!periods.has(period as "7d" | "30d" | "3m" | "1y")) return Response.json({ error: "invalid-period", data: [] }, { status: 400, headers });
  try {
    const rows = await getCoinrankingDailyHistory(uuid, period as "7d" | "30d" | "3m" | "1y");
    return Response.json({ data: rows.map((row) => ({ timestamp: row.timestamp, price: row.price, referenceDate: row.referenceDate })),
      source: "Coinranking", attribution: rows[0]?.attribution ?? "Data provided by Coinranking", currency: "USD",
      period, quoteType: "daily-observed-aggregate-price", cached: false }, { status: 200, headers });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "financial-db-unavailable";
    console.error("Coinranking database history read failed", code);
    return Response.json({ error: "market-data-unavailable", data: [] }, { status: 503, headers });
  }
}

import { financialRateLimit } from "@/lib/data-platform/financial-route";
import { readGoldMarket } from "@/lib/data-platform/gold-db-market.mjs";
import { getFinancialReadOnlyPool } from "@/lib/db/financial-readonly";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff", "x-market-source": "gold-db" };

export async function GET(request: Request) {
  const limited = financialRateLimit(request);
  if (limited) return limited;
  try {
    const market = await readGoldMarket(getFinancialReadOnlyPool());
    if (market.status !== "success") return Response.json({ error: market.status, data: [] }, { status: 503, headers });
    return Response.json(market, { status: 200, headers });
  } catch {
    return Response.json({ error: "market-data-unavailable", data: [] }, { status: 503, headers });
  }
}

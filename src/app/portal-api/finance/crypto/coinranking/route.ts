import { getCoinrankingDailyMarket } from "@/lib/db/financial-queries";
import { financialRateLimit } from "@/lib/data-platform/financial-route";
import { getCoinrankingAssetAliases } from "@/lib/data-platform/providers/coinranking.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = { "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff" };

export async function GET(request: Request) {
  const limited = financialRateLimit(request);
  if (limited) return limited;
  try {
    const snapshot = await getCoinrankingDailyMarket();
    if (!snapshot.data.length) {
      return Response.json({ error: "provider-rights-pending", data: [], source: "Coinranking", attribution: snapshot.attribution }, { status: 503, headers });
    }
    return Response.json({ ...snapshot, data: snapshot.data.map((coin) => ({ ...coin, aliases: getCoinrankingAssetAliases(coin.uuid) })) }, { status: 200, headers: { ...headers, "x-market-source": "coinranking-db" } });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "financial-db-unavailable";
    console.error("Coinranking database market read failed", code);
    return Response.json({ error: "market-data-unavailable", data: [] }, { status: 503, headers });
  }
}

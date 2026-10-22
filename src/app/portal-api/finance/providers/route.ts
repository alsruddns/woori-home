import { financialApiResponse } from "@/lib/data-platform/financial-api.mjs";
import { listFinancialProviders } from "@/lib/data-platform/providers/catalog.mjs";
import { financialRateLimit } from "@/lib/data-platform/financial-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const throttled = financialRateLimit(request);
  if (throttled) return throttled;
  return financialApiResponse({ providers: listFinancialProviders() });
}

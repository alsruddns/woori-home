import { financialApiResponse } from "@/lib/data-platform/financial-api.mjs";
import { listFinancialProviders } from "@/lib/data-platform/providers/catalog.mjs";
import { getFinancialProviderRuntimeStatus } from "@/lib/db/financial-queries";
import { financialRateLimit } from "@/lib/data-platform/financial-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const throttled = financialRateLimit(request);
  if (throttled) return throttled;
  const registry = listFinancialProviders();
  try {
    const runtime = await getFinancialProviderRuntimeStatus(registry.map((provider) => provider.id));
    const byId = new Map(runtime.map((item) => [item.providerId, item]));
    return financialApiResponse({ providers: registry.map((provider) => ({ ...provider, runtime: byId.get(provider.id) ?? null })) });
  } catch {
    return financialApiResponse({ providers: registry.map((provider) => ({ ...provider, runtime: null })), runtimeStatus: "unavailable" });
  }
}

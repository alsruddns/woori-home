import { financialCompanyFactsRoute } from "@/lib/data-platform/financial-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) { return financialCompanyFactsRoute(request); }

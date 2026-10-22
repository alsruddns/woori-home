import { financialHistoryRoute } from "@/lib/data-platform/financial-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  return financialHistoryRoute(request, assetId);
}

import { handleWorldBankComparison } from "@/lib/db/world-bank-comparison-handler";

export async function GET(request: Request) {
  return handleWorldBankComparison(request);
}

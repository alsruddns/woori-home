export type GoldMarketRow = {
  sourceAssetId: string; venue: string; currency: "USD"; unit: "troy-ounce";
  referenceDate: string; referenceTimezone: "UTC"; priceKind: "spot-reference"; price: string;
  pricePerGram: string; collectedAt: string; observedAt: string; providerId: string;
  providerName: string; sourceUrl: string; attribution: string; licenseReference: string; stale: boolean;
};
export function readGoldMarket(client: { query: (sql: string, values?: unknown[]) => Promise<{rows: Record<string, unknown>[]}> }, options?: {now?: Date}): Promise<{status: string; data: GoldMarketRow[]; reasons?: string[]}>;

export type FinancialAssetType = "stock" | "crypto" | "metal" | "energy" | "agriculture" | "fx" | "rate" | "index";

export type FinancialProviderAsset = {
  sourceAssetId: string;
  assetType: FinancialAssetType;
  symbol: string;
  name: string;
  venue?: string;
  countryCode?: string | null;
  currency: string;
  unit: string;
  timezone: string;
  sector?: string | null;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
};

export type FinancialProviderPrice = {
  sourceAssetId: string;
  referenceDate: string;
  referenceTimezone: string;
  priceKind: string;
  open?: string | null;
  high?: string | null;
  low?: string | null;
  close: string;
  volume?: string | null;
  marketCap?: string | null;
  isAdjusted?: boolean;
  fetchedAt: string;
  sourceUpdatedAt?: string | null;
};

export type FinancialProvider = {
  id: string;
  datasetId: string;
  licenseStatus: "verified" | "pending" | "restricted" | "rejected";
  attribution: string;
  sourceUrl: string;
  fetchDailyPrices(input: { startDate: string; endDate: string; signal: AbortSignal; limit?: number }): Promise<{
    snapshotVersion?: string;
    assets: FinancialProviderAsset[];
    prices: FinancialProviderPrice[];
    failures?: { symbol: string; reason: string }[];
  }>;
};

export type FinancialProviderSnapshot = {
  schemaVersion: 1;
  sourceId: string;
  datasetId: string;
  snapshotVersion: string | null;
  assets: FinancialProviderAsset[];
  prices: FinancialProviderPrice[];
  failures: { symbol: string; reason: string }[];
};

export class FinancialProviderError extends Error {
  code: string;
  constructor(code: string, message?: string);
}

export function collectFinancialProviderSnapshot(
  provider: FinancialProvider,
  request: { startDate: string; endDate: string; marketTimezone?: string; limit?: number },
  options?: { maxAttempts?: number; timeoutMs?: number; baseDelayMs?: number; maxDelayMs?: number; maxRecords?: number; now?: Date; sleep?: (milliseconds: number) => Promise<void> },
): Promise<FinancialProviderSnapshot>;

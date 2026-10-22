import { createUpbitKrwDailyProvider } from "./upbit.mjs";

export const financialProviderCatalog = [
  {
    id: "upbit-quotation",
    name: "Upbit Quotation API",
    markets: ["crypto:KRW"],
    access: "free-public-api",
    apiKeyRequired: false,
    rightsStatus: "pending",
    publicDisplay: "pending",
    databaseRetention: "pending",
    sourceUrl: "https://docs.upbit.com/kr/reference",
    termsUrl: "https://docs.upbit.com/kr/v1.6.4",
    datasetId: "upbit-krw-daily-candles",
    createAdapter: createUpbitKrwDailyProvider,
  },
  {
    id: "sec-edgar-companyfacts",
    name: "SEC EDGAR Company Facts",
    markets: ["us:issuer-filings"],
    access: "free-public-api",
    apiKeyRequired: false,
    rightsStatus: "pending-series-and-display-review",
    publicDisplay: "not-confirmed",
    databaseRetention: "not-reviewed",
    sourceUrl: "https://www.sec.gov/edgar/sec-api-documentation",
    termsUrl: "https://www.sec.gov/about/privacy-information",
    datasetId: null,
  },
  {
    id: "binance-spot-market-data",
    name: "Binance Spot Market Data",
    markets: ["crypto:USD-quoted-pairs"],
    access: "free-public-api",
    apiKeyRequired: false,
    rightsStatus: "pending",
    publicDisplay: "not-confirmed",
    databaseRetention: "not-confirmed",
    sourceUrl: "https://developers.binance.com/en/docs/products/spot/rest-api",
    termsUrl: "https://developers.binance.com/en/docs/products/spot/PROD-TERMS-OF-USE",
    datasetId: null,
  },
];

export function listFinancialProviders() {
  return financialProviderCatalog.map(({ createAdapter, ...provider }) => {
    void createAdapter;
    return provider;
  });
}

export function getFinancialProvider(id, options) {
  const entry = financialProviderCatalog.find((provider) => provider.id === id);
  return entry?.createAdapter ? entry.createAdapter(options) : null;
}

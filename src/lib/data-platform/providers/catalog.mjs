import { createUpbitKrwDailyProvider } from "./upbit.mjs";
import { createOpenDartProvider } from "./opendart.mjs";
import { createSecEdgarProvider } from "./sec-edgar.mjs";

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
    rightsStatus: "verified-sec-edgar-public-filings",
    publicDisplay: "permitted-for-sec-public-filing-content",
    databaseRetention: "permitted-for-sec-public-filing-content",
    sourceUrl: "https://www.sec.gov/edgar/sec-api-documentation",
    termsUrl: "https://www.sec.gov/about/webmaster-frequently-asked-questions",
    datasetId: "sec-company-facts",
    createAdapter: createSecEdgarProvider,
  },
  {
    id: "opendart-company-financials",
    name: "OpenDART Company Financial Statements",
    markets: ["kr:issuer-filings"],
    access: "free-public-api",
    apiKeyRequired: true,
    rightsStatus: "pending-display-and-retention-review",
    publicDisplay: "not-confirmed",
    databaseRetention: "not-confirmed",
    sourceUrl: "https://opendart.fss.or.kr/intro/main.do",
    termsUrl: "https://opendart.fss.or.kr/intro/terms.do",
    datasetId: null,
    createAdapter: createOpenDartProvider,
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
    return {
      ...provider,
      configured: provider.id === "opendart-company-financials" ? Boolean(process.env.OPENDART_API_KEY ?? process.env.DART_API_KEY) : true,
      collectionEnabled: provider.rightsStatus === "verified-sec-edgar-public-filings" || provider.rightsStatus === "verified",
    };
  });
}

export function getFinancialProvider(id, options) {
  const entry = financialProviderCatalog.find((provider) => provider.id === id);
  return entry?.createAdapter ? entry.createAdapter(options) : null;
}

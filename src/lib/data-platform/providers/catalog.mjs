import { createUpbitKrwDailyProvider } from "./upbit.mjs";
import { createOpenDartProvider } from "./opendart.mjs";
import { createSecEdgarProvider } from "./sec-edgar.mjs";
import { createBithumbKrwProvider } from "./bithumb.mjs";
import { createBinanceSpotProvider } from "./binance-spot.mjs";
import { createTwelveDataUsProvider } from "./twelvedata-us.mjs";
import { createFscKrxStockProvider } from "./fsc-krx-stocks.mjs";
import { createCoinGeckoProvider } from "./coingecko.mjs";
import { createCoinrankingProvider } from "./coinranking.mjs";

export const financialProviderCatalog = [
  {
    id: "upbit-quotation",
    name: "Upbit Quotation API",
    markets: ["crypto:KRW"],
    access: "free-public-api",
    apiKeyRequired: false,
    rightsStatus: "pending",
    rights: { apiAccess: "pending", publicDisplay: "pending", dbStorage: "pending", longTermRetention: "pending", userApi: "pending", csvRedistribution: "pending", derivedVisualization: "pending", dailySnapshot: "pending", adSupportedDisplay: "pending" },
    collectionEnabled: false,
    sourceUrl: "https://docs.upbit.com/kr/reference",
    termsUrl: "https://docs.upbit.com/kr/v1.6.4",
    datasetId: "upbit-krw-daily-candles",
    createAdapter: createUpbitKrwDailyProvider,
  },
  {
    id: "bithumb-public", name: "Bithumb Public API", markets: ["crypto:KRW"], access: "free-public-api", apiKeyRequired: false,
    rightsStatus: "pending", rights: { apiAccess: "pending", publicDisplay: "pending", dbStorage: "pending", longTermRetention: "pending", userApi: "pending", csvRedistribution: "pending", derivedVisualization: "pending", dailySnapshot: "pending", adSupportedDisplay: "pending" },
    collectionEnabled: false, sourceUrl: "https://apidocs.bithumb.com/", termsUrl: "https://apidocs.bithumb.com/", datasetId: "bithumb-krw-daily-candles", createAdapter: createBithumbKrwProvider,
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
    rights: { apiAccess: "pending", publicDisplay: "pending", dbStorage: "pending", longTermRetention: "pending", userApi: "pending", csvRedistribution: "pending", derivedVisualization: "pending", dailySnapshot: "pending", adSupportedDisplay: "pending" },
    collectionEnabled: false, datasetId: "binance-usdt-daily-candles", createAdapter: createBinanceSpotProvider,
  },
  {
    id: "coingecko-markets", name: "CoinGecko API (global aggregate)", markets: ["crypto:USD aggregate"], access: "free-demo-key / paid commercial plan",
    apiKeyRequired: true, rightsStatus: "restricted-free-tier", rights: { apiAccess: "pending", publicDisplay: "restricted", dbStorage: "restricted", longTermRetention: "restricted", userApi: "restricted", csvRedistribution: "denied", derivedVisualization: "restricted", dailySnapshot: "pending", adSupportedDisplay: "restricted" },
    collectionEnabled: false, sourceUrl: "https://www.coingecko.com/en/api", termsUrl: "https://www.coingecko.com/en/api_terms", datasetId: "coingecko-usd-daily-prices", createAdapter: createCoinGeckoProvider,
  },
  {
    id: "coinranking-aggregate", name: "Coinranking API (global aggregate)", markets: ["crypto:USD aggregate"], access: "API key required",
    apiKeyRequired: true, rightsStatus: "pending-explicit-competition-and-public-display-review",
    rights: { apiAccess: "pending", publicDisplay: "pending", userApi: "pending", derivedVisualization: "pending", charts: "pending", temporaryCache: "pending", dbStorage: "pending", longTermRetention: "pending", dailySnapshot: "pending", adSupportedDisplay: "pending", competitorPermission: "pending", rawRedistribution: "denied" },
    collectionEnabled: false, sourceUrl: "https://coinranking.com/", termsUrl: "https://support.coinranking.com/article/131-api-terms-conditions",
    datasetId: "coinranking-usd-daily-snapshots", createAdapter: createCoinrankingProvider,
  },
  {
    id: "twelvedata-us-equities", name: "Twelve Data US Equities", markets: ["us:stocks"], access: "paid-api", apiKeyRequired: true,
    rightsStatus: "pending", rights: { apiAccess: "pending", publicDisplay: "pending", dbStorage: "pending", longTermRetention: "pending", userApi: "pending", csvRedistribution: "pending", derivedVisualization: "pending" },
    collectionEnabled: false, sourceUrl: "https://twelvedata.com/docs", termsUrl: "https://twelvedata.com/terms", datasetId: "twelvedata-us-daily-prices", createAdapter: createTwelveDataUsProvider,
  },
  {
    id: "fsc-krx-stock-prices", name: "FSC / KRX Stock Price Open API", markets: ["kr:stocks"], access: "free-public-api",
    apiKeyRequired: true, rightsStatus: "restricted", rights: { apiAccess: "confirmed", publicDisplay: "denied", dbStorage: "restricted", longTermRetention: "restricted", userApi: "denied", csvRedistribution: "denied", derivedVisualization: "denied" },
    collectionEnabled: false, sourceUrl: "https://www.data.go.kr/data/15094808/openapi.do", termsUrl: "https://www.data.go.kr/catalog/15094808/openapi.json", datasetId: "fsc-krx-daily-stock-prices", createAdapter: createFscKrxStockProvider,
  },
];

export function listFinancialProviders() {
  return financialProviderCatalog.map(({ createAdapter, ...provider }) => {
    void createAdapter;
    return {
      ...provider,
      collectionEnabled: provider.collectionEnabled ?? false,
      configured: provider.id === "opendart-company-financials" ? Boolean(process.env.OPENDART_API_KEY ?? process.env.DART_API_KEY) : provider.id === "twelvedata-us-equities" ? Boolean(process.env.TWELVEDATA_API_KEY) : provider.id === "fsc-krx-stock-prices" ? Boolean(process.env.DATA_GO_KR_STOCK_KEY) : provider.id === "coingecko-markets" ? Boolean(process.env.COINGECKO_API_KEY) : provider.id === "coinranking-aggregate" ? Boolean(process.env.COINRANKING_API_KEY) : true,
      publicDisplay: provider.rights?.publicDisplay ?? provider.publicDisplay,
      databaseRetention: provider.rights?.longTermRetention ?? provider.databaseRetention,
    };
  });
}

export function getFinancialProvider(id, options) {
  const entry = financialProviderCatalog.find((provider) => provider.id === id);
  return entry?.createAdapter ? entry.createAdapter(options) : null;
}

import { getFinancialProvider, listFinancialProviders } from "../../src/lib/data-platform/providers/catalog.mjs";
import { collectFinancialProviderSnapshot } from "../../src/lib/data-platform/financial-provider.mjs";
import { isDailySnapshotReady, previousDailyReferenceDate } from "../../src/lib/data-platform/crypto-daily.mjs";

const args = process.argv.slice(2);
const options = {};
for (const arg of args) {
  const match = arg.match(/^--(provider|date|limit)=(.+)$/);
  if (!match || Object.hasOwn(options, match[1])) throw new Error("Usage: pnpm data:financial:probe -- --provider=ID [--date=YYYY-MM-DD] [--limit=1..8]");
  options[match[1]] = match[2];
}
const provider = getFinancialProvider(options.provider);
if (!provider?.datasetId || !provider.marketTimezone || typeof provider.fetchDailyPrices !== "function") {
  console.error("Provider has no daily-price adapter. Available adapters:", listFinancialProviders().filter((item) => item.datasetId).map((item) => item.id).join(", "));
  process.exitCode = 2;
} else {
  const cryptoDaily = provider.assetType === "crypto";
  const today = new Date();
  if (cryptoDaily && !isDailySnapshotReady(today, provider.marketTimezone, 10)) throw new Error("The prior crypto daily candle is not considered final until 10:00 in the market timezone.");
  const date = options.date ?? (cryptoDaily ? previousDailyReferenceDate(today, provider.marketTimezone) : new Intl.DateTimeFormat("en-CA", { timeZone: provider.marketTimezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() - 86_400_000)));
  if (cryptoDaily && date !== previousDailyReferenceDate(today, provider.marketTimezone)) throw new Error("Crypto no-storage probes are limited to the prior finalized daily candle.");
  const maximumLimit = cryptoDaily ? 12 : 8;
  const limit = Math.max(1, Math.min(maximumLimit, Math.trunc(Number(options.limit ?? maximumLimit)) || maximumLimit));
  // This explicit probe is for internal adapter/schema verification only. It never writes to PostgreSQL or creates an API response.
  const probeProvider = { ...provider, licenseStatus: "verified", attribution: provider.attribution ?? `Internal probe: ${provider.providerName}`, sourceUrl: provider.sourceUrl };
  const snapshot = await collectFinancialProviderSnapshot(probeProvider, { startDate: date, endDate: date, marketTimezone: provider.marketTimezone, limit }, { maxAttempts: 2, timeoutMs: 15_000, maxRecords: 100 });
  let markets = [], currentQuotes = [];
  if (!cryptoDaily && typeof provider.fetchMarkets === "function" && typeof provider.fetchTickers === "function") {
    const listed = await provider.fetchMarkets({ signal: new AbortController().signal });
    if (!Array.isArray(listed)) throw new Error("Provider returned an invalid market catalog");
    markets = listed.slice(0, limit);
    currentQuotes = await provider.fetchTickers(markets.map((item) => item.market ?? item.symbol), { signal: new AbortController().signal });
    if (!Array.isArray(currentQuotes)) throw new Error("Provider returned an invalid ticker collection");
  }
  console.log(JSON.stringify({ mode: "internal-probe-no-storage", provider: provider.id, dataset: provider.datasetId, date, dailyOnly: cryptoDaily,
    assets: snapshot.assets.length, prices: snapshot.prices.length, latestReferenceDate: snapshot.prices.map((row) => row.referenceDate).sort().at(-1),
    currencies: [...new Set(snapshot.assets.map((asset) => asset.currency))], venues: [...new Set(snapshot.assets.map((asset) => asset.venue))],
    failures: snapshot.failures, liveQuoteRequests: currentQuotes.length }, null, 2));
}

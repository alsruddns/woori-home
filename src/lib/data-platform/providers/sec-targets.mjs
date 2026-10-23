// Curated SEC-reporting issuers for portal fundamentals. The taxonomy labels are
// portal groupings; legal identity and ticker/CIK are resolved from SEC data.
export const SEC_TARGETS = Object.freeze([
  ...["AAPL", "MSFT", "ORCL", "CRM", "IBM", "NOW", "INTU", "PLTR", "PANW", "SNPS"].map((ticker) => ({ ticker, sector: "information-technology" })),
  ...["NVDA", "AVGO", "AMD", "QCOM", "TXN", "INTC", "MU", "AMAT", "LRCX", "KLAC"].map((ticker) => ({ ticker, sector: "semiconductors" })),
  ...["JPM", "BAC", "WFC", "GS", "MS", "BLK", "SCHW", "AXP", "V", "MA"].map((ticker) => ({ ticker, sector: "financials" })),
  ...["LLY", "UNH", "JNJ", "ABBV", "MRK", "ABT", "TMO", "AMGN", "GILD", "ISRG"].map((ticker) => ({ ticker, sector: "healthcare" })),
  ...["WMT", "COST", "PG", "KO", "PEP", "PM", "CL", "MDLZ", "KHC", "EL"].map((ticker) => ({ ticker, sector: "consumer" })),
  ...["XOM", "CVX", "COP", "SLB", "EOG", "OXY", "PSX", "MPC", "VLO", "FANG"].map((ticker) => ({ ticker, sector: "energy" })),
  ...["GE", "CAT", "RTX", "HON", "DE", "UNP", "UPS", "LMT", "ETN", "CMI"].map((ticker) => ({ ticker, sector: "industrials" })),
  ...["GOOGL", "META", "NFLX", "DIS", "T", "VZ", "CMCSA", "TMUS", "CHTR", "TTWO"].map((ticker) => ({ ticker, sector: "communications" })),
  ...["NEE", "SO", "DUK", "CEG", "AEP", "XEL", "EXC", "ED", "D", "PEG"].map((ticker) => ({ ticker, sector: "utilities" })),
  ...["PLD", "AMT", "EQIX", "SPG", "O", "WELL", "VICI", "PSA", "CCI", "VTR"].map((ticker) => ({ ticker, sector: "real-estate" })),
]);

const TICKER_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/;

export function parseSecTickerDirectory(text, targets = SEC_TARGETS) {
  let payload;
  try { payload = JSON.parse(text); } catch { throw new Error("SEC ticker directory is not valid JSON."); }
  if (!Array.isArray(payload?.fields) || !Array.isArray(payload?.data)) throw new Error("SEC ticker directory has an unsupported schema.");
  const columns = Object.fromEntries(payload.fields.map((field, index) => [field, index]));
  for (const key of ["cik", "name", "ticker", "exchange"]) if (!Number.isInteger(columns[key])) throw new Error(`SEC ticker directory is missing ${key}.`);
  const requested = new Map();
  for (const target of targets) {
    const ticker = typeof target?.ticker === "string" ? target.ticker.toUpperCase() : "";
    if (!TICKER_PATTERN.test(ticker) || requested.has(ticker) || typeof target.sector !== "string" || !target.sector) throw new Error("SEC target tickers and sector groups must be valid and unique.");
    requested.set(ticker, target.sector);
  }
  const found = new Map();
  for (const row of payload.data) {
    if (!Array.isArray(row) || row.length < payload.fields.length) continue;
    const ticker = String(row[columns.ticker] ?? "").toUpperCase();
    if (!requested.has(ticker)) continue;
    const cikNumber = String(row[columns.cik] ?? "");
    const name = String(row[columns.name] ?? "").trim();
    const exchange = String(row[columns.exchange] ?? "").trim();
    if (!/^\d{1,10}$/.test(cikNumber) || !name || !["Nasdaq", "NYSE", "NYSE American"].includes(exchange)) continue;
    const candidate = { ticker, cik: cikNumber.padStart(10, "0"), name, exchange, sector: requested.get(ticker) };
    const prior = found.get(ticker);
    if (!prior || (candidate.exchange === "Nasdaq" || candidate.exchange === "NYSE")) found.set(ticker, candidate);
  }
  const missing = [...requested.keys()].filter((ticker) => !found.has(ticker));
  const companies = [...found.values()];
  if (companies.length > 100) throw new Error("SEC company collection is capped at 100 targets.");
  if (new Set(companies.map(({ cik }) => cik)).size !== companies.length) throw new Error("SEC ticker directory maps multiple targets to one CIK.");
  companies.unresolvedTargets = missing;
  return companies;
}

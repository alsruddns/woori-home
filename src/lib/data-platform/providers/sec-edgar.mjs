export const SEC_SOURCE_ID = "sec-edgar-companyfacts";
export const SEC_DATASET_ID = "sec-company-facts";

export const SEC_COMPANIES = [
  { ticker: "AAPL", cik: "0000320193", exchange: "NASDAQ" },
  { ticker: "MSFT", cik: "0000789019", exchange: "NASDAQ" },
  { ticker: "NVDA", cik: "0001045810", exchange: "NASDAQ" },
  { ticker: "GOOGL", cik: "0001652044", exchange: "NASDAQ" },
  { ticker: "AMZN", cik: "0001018724", exchange: "NASDAQ" },
  { ticker: "META", cik: "0001326801", exchange: "NASDAQ" },
  { ticker: "TSLA", cik: "0001318605", exchange: "NASDAQ" },
];

export const SEC_CONCEPTS = {
  revenue: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"],
  operatingIncome: ["OperatingIncomeLoss"],
  netIncome: ["NetIncomeLoss"],
  assets: ["Assets"],
  liabilities: ["Liabilities"],
  operatingCashFlow: ["NetCashProvidedByUsedInOperatingActivities"],
};

const BASE = "https://data.sec.gov/api/xbrl/companyfacts/";
const ALLOWED_FORMS = new Set(["10-K", "10-Q"]);
const DECIMAL_PATTERN = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function parseSecCompanyFactsJson(jsonText) {
  const preserved = jsonText.replace(/("val"\s*:\s*)(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(?=\s*[,}])/g, "$1\"$2\"");
  return JSON.parse(preserved);
}

export function normalizeSecCompanyFacts(payload, company, fetchedAt = new Date()) {
  if (!payload || typeof payload.entityName !== "string" || !payload.facts?.["us-gaap"]) throw new Error("Invalid SEC companyfacts response.");
  const facts = [];
  for (const [metric, concepts] of Object.entries(SEC_CONCEPTS)) {
    const isDuration = metric !== "assets" && metric !== "liabilities";
    for (const concept of concepts) {
      const conceptFact = payload.facts["us-gaap"][concept];
      if (!conceptFact) continue;
      const units = conceptFact.units ?? {};
      for (const [unit, observations] of Object.entries(units)) {
        if (unit !== "USD") continue;
        for (const observation of observations) {
        const exactValue = typeof observation.val === "number" && Number.isFinite(observation.val) ? String(observation.val) : typeof observation.val === "string" && DECIMAL_PATTERN.test(observation.val) ? observation.val : null;
        if (!ALLOWED_FORMS.has(observation.form) || !observation.filed || !observation.end || !observation.accn || exactValue === null) continue;
        if (isDuration !== Boolean(observation.start)) continue;
        if (observation.end > new Date().toISOString().slice(0, 10)) continue;
        const accession = observation.accn.replaceAll("-", "");
        facts.push({
          metric, taxonomy: "us-gaap", concept, unit, value: exactValue, periodKey: observation.start ?? "instant",
          fiscalYear: Number.isInteger(observation.fy) ? observation.fy : null,
          fiscalPeriod: typeof observation.fp === "string" ? observation.fp : null,
          startDate: observation.start ?? null, endDate: observation.end, filedDate: observation.filed,
          form: observation.form, accessionNumber: observation.accn,
          sourceUrl: `https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/${accession}/`, fetchedAt,
        });
        }
      }
    }
  }
  return {
    company: {
      providerCompanyId: company.cik,
      cik: company.cik,
      ticker: company.ticker,
      name: payload.entityName,
      exchange: company.exchange,
      countryCode: "US",
      sourceUrl: `https://www.sec.gov/edgar/browse/?CIK=${Number(company.cik)}&owner=exclude`,
    },
    facts,
  };
}

export function createSecEdgarProvider({ fetchImpl = fetch, userAgent = process.env.SEC_EDGAR_USER_AGENT ?? "Woori.today financial research contact krdd125@gmail.com", wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  if (!userAgent || !/\S+\s+\S+@\S+\.\S+/.test(userAgent)) throw Object.assign(new Error("SEC_EDGAR_USER_AGENT must identify the application and a monitored contact email."), { code: "sec-user-agent-missing" });
  const cache = new Map();
  return {
    id: SEC_SOURCE_ID,
    async fetchCompany(company) {
      if (!SEC_COMPANIES.some((candidate) => candidate.cik === company.cik)) throw new Error("Company is outside the reviewed SEC collection scope.");
      const url = `${BASE}CIK${company.cik}.json`;
      if (cache.has(url)) return cache.get(url);
      if (cache.size) await wait(150);
      const response = await fetchImpl(url, { headers: { "User-Agent": userAgent, "Accept-Encoding": "gzip, deflate", Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
      if (response.status === 429) throw Object.assign(new Error("SEC rate limit response."), { code: "sec-rate-limited", retryAfter: response.headers.get("retry-after") });
      if (!response.ok) throw Object.assign(new Error(`SEC API responded with ${response.status}.`), { code: `sec-http-${response.status}` });
      const result = normalizeSecCompanyFacts(parseSecCompanyFactsJson(await response.text()), company);
      cache.set(url, result);
      return result;
    },
    async collect(companies = SEC_COMPANIES) {
      const output = [];
      for (const company of companies) output.push(await this.fetchCompany(company));
      return output;
    },
  };
}

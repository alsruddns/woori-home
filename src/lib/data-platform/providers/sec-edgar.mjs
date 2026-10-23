import { parseSecTickerDirectory, SEC_TARGETS } from "./sec-targets.mjs";

export { SEC_TARGETS };
export const SEC_SOURCE_ID = "sec-edgar-companyfacts";
export const SEC_DATASET_ID = "sec-company-facts";
export const SEC_COMPANY_DIRECTORY_URL = "https://www.sec.gov/files/company_tickers_exchange.json";
export const SEC_SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK";

// Kept as a small stable fixture for downstream legacy tests and callers.
export const SEC_COMPANIES = [
  { ticker: "AAPL", cik: "0000320193", exchange: "Nasdaq", sector: "information-technology" },
  { ticker: "MSFT", cik: "0000789019", exchange: "Nasdaq", sector: "information-technology" },
  { ticker: "NVDA", cik: "0001045810", exchange: "Nasdaq", sector: "semiconductors" },
  { ticker: "GOOGL", cik: "0001652044", exchange: "Nasdaq", sector: "communications" },
  { ticker: "AMZN", cik: "0001018724", exchange: "Nasdaq", sector: "consumer" },
  { ticker: "META", cik: "0001326801", exchange: "Nasdaq", sector: "communications" },
  { ticker: "TSLA", cik: "0001318605", exchange: "Nasdaq", sector: "consumer" },
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
const ALLOWED_FORMS = new Set(["10-K", "10-Q", "10-K/A", "10-Q/A"]);
const TRACKED_FORMS = new Set(["10-K", "10-Q", "10-K/A", "10-Q/A"]);
const DECIMAL_PATTERN = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function parseSecCompanyFactsJson(jsonText) {
  const preserved = jsonText.replace(/("val"\s*:\s*)(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(?=\s*[,}])/g, "$1\"$2\"");
  return JSON.parse(preserved);
}

export function normalizeSecCompanyFacts(payload, company, fetchedAt = new Date(), profile = {}) {
  if (!payload || typeof payload.entityName !== "string" || !payload.facts?.["us-gaap"]) throw new Error("Invalid SEC companyfacts response.");
  const facts = [];
  for (const [metric, concepts] of Object.entries(SEC_CONCEPTS)) {
    const isDuration = metric !== "assets" && metric !== "liabilities";
    for (const concept of concepts) {
      const conceptFact = payload.facts["us-gaap"][concept];
      if (!conceptFact) continue;
      for (const [unit, observations] of Object.entries(conceptFact.units ?? {})) {
        if (unit !== "USD") continue;
        for (const observation of observations) {
          const exactValue = typeof observation.val === "number" && Number.isFinite(observation.val) ? String(observation.val) : typeof observation.val === "string" && DECIMAL_PATTERN.test(observation.val) ? observation.val : null;
          if (!ALLOWED_FORMS.has(observation.form) || !observation.filed || !observation.end || !observation.accn || exactValue === null) continue;
          if (isDuration !== Boolean(observation.start) || observation.end > new Date().toISOString().slice(0, 10)) continue;
          facts.push({
            metric, taxonomy: "us-gaap", concept, unit, value: exactValue, periodKey: observation.start ?? "instant",
            fiscalYear: Number.isInteger(observation.fy) ? observation.fy : null,
            fiscalPeriod: typeof observation.fp === "string" ? observation.fp : null,
            startDate: observation.start ?? null, endDate: observation.end, filedDate: observation.filed,
            form: observation.form, accessionNumber: observation.accn,
            sourceUrl: `https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/${observation.accn.replaceAll("-", "")}/`, fetchedAt,
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
      sector: company.sector ?? "other",
      sicCode: profile.sicCode ?? null,
      industry: profile.industry ?? null,
      lastSubmissionAccession: profile.latestFiling?.accessionNumber ?? null,
      lastSubmissionFiledDate: profile.latestFiling?.filedDate ?? null,
      lastSubmissionForm: profile.latestFiling?.form ?? null,
      sourceUrl: `https://www.sec.gov/edgar/browse/?CIK=${Number(company.cik)}&owner=exclude`,
      ...(company.rekeyFromCik ? { rekeyFromCik: company.rekeyFromCik } : {}),
      ...(company.rekeyFromName ? { rekeyFromName: company.rekeyFromName } : {}),
    },
    facts,
  };
}

function retryDelay(response, attempt) {
  const raw = response.headers?.get?.("retry-after");
  const seconds = raw && Number.isFinite(Number(raw)) ? Number(raw) : raw ? Math.max(0, (Date.parse(raw) - Date.now()) / 1000) : 0;
  return Math.min(10_000, Math.max(seconds * 1000, 250 * (2 ** attempt)));
}

export function createSecEdgarProvider({ fetchImpl = fetch, userAgent = process.env.SEC_EDGAR_USER_AGENT ?? "Woori.today financial research contact krdd125@gmail.com", wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), minRequestIntervalMs = 150 } = {}) {
  if (!userAgent || !/\S+\s+\S+@\S+\.\S+/.test(userAgent)) throw Object.assign(new Error("SEC_EDGAR_USER_AGENT must identify the application and a monitored contact email."), { code: "sec-user-agent-missing" });
  const cache = new Map();
  let directoryPromise;
  let lastRequestAt = 0;

  async function requestJson(url) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const delay = Math.max(0, minRequestIntervalMs - (Date.now() - lastRequestAt));
      if (delay) await wait(delay);
      lastRequestAt = Date.now();
      let response;
      try {
        response = await fetchImpl(url, { headers: { "User-Agent": userAgent, "Accept-Encoding": "gzip, deflate", Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
      } catch (error) {
        lastError = error;
        if (attempt === 2) throw Object.assign(new Error("SEC API network request failed."), { code: "sec-network-failed", cause: error });
        await wait(Math.min(4_000, 250 * (2 ** attempt)));
        continue;
      }
      if (response.status === 429 || response.status >= 500) {
        lastError = Object.assign(new Error(`SEC API responded with ${response.status}.`), { code: response.status === 429 ? "sec-rate-limited" : `sec-http-${response.status}`, retryAfter: response.headers?.get?.("retry-after") ?? null });
        if (attempt < 2) await wait(retryDelay(response, attempt));
        continue;
      }
      if (!response.ok) throw Object.assign(new Error(`SEC API responded with ${response.status}.`), { code: `sec-http-${response.status}` });
      return response.json();
    }
    throw lastError ?? Object.assign(new Error("SEC API request failed."), { code: "sec-request-failed" });
  }

  async function loadDirectory() {
    if (!directoryPromise) directoryPromise = requestJson(SEC_COMPANY_DIRECTORY_URL).then((directory) => parseSecTickerDirectory(JSON.stringify(directory)));
    return directoryPromise;
  }

  return {
    id: SEC_SOURCE_ID,
    async resolveCompanies(targets = SEC_TARGETS) {
      const directory = await loadDirectory();
      const byTicker = new Map(directory.map((company) => [company.ticker, company]));
      const resolved = targets.map((target) => {
        const match = byTicker.get(target.ticker);
        return match ? { ...match, sector: target.sector, sourceUrl: `https://www.sec.gov/edgar/browse/?CIK=${Number(match.cik)}&owner=exclude` } : null;
      }).filter(Boolean);
      resolved.unresolvedTargets = targets.filter((target) => !byTicker.has(target.ticker));
      return resolved;
    },
    async fetchSubmissions(company) {
      if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(company.ticker) || !/^\d{10}$/.test(company.cik)) throw new Error("Invalid SEC company identity.");
      const key = `submission:${company.cik}`;
      if (cache.has(key)) return cache.get(key);
      const payload = await requestJson(`${SEC_SUBMISSIONS_URL}${company.cik}.json`);
      if (!payload || typeof payload.name !== "string" || !payload.filings?.recent || !Array.isArray(payload.filings.recent.form)) throw new Error(`Invalid SEC submissions payload for ${company.ticker}.`);
      if (Array.isArray(payload.tickers) && payload.tickers.length && !payload.tickers.includes(company.ticker)) throw new Error(`SEC submissions identity mismatch for ${company.ticker}.`);
      const recent = payload.filings.recent;
      const indexes = recent.form.map((form, index) => TRACKED_FORMS.has(form) ? index : -1).filter((index) => index >= 0);
      const latestFiling = indexes.map((index) => ({
        form: recent.form[index], accessionNumber: recent.accessionNumber[index], filedDate: recent.filingDate[index],
      })).filter((filing) => /^\d{4}-\d{2}-\d{2}$/.test(filing.filedDate) && typeof filing.accessionNumber === "string")
        .sort((left, right) => right.filedDate.localeCompare(left.filedDate) || right.accessionNumber.localeCompare(left.accessionNumber))[0] ?? null;
      const metadata = {
        name: payload.name,
        sicCode: typeof payload.sic === "string" && /^\d{4}$/.test(payload.sic) ? payload.sic : null,
        industry: typeof payload.sicDescription === "string" ? payload.sicDescription : null,
        latestFiling,
      };
      cache.set(key, metadata);
      return metadata;
    },
    async fetchCompany(company, { profile = {} } = {}) {
      if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(company.ticker) || !/^\d{10}$/.test(company.cik)) throw new Error("Invalid SEC company identity.");
      const reviewed = new Set([...SEC_COMPANIES, ...SEC_TARGETS].map(({ ticker }) => ticker));
      const knownCik = SEC_COMPANIES.find(({ ticker }) => ticker === company.ticker)?.cik;
      if (!reviewed.has(company.ticker)) throw new Error("Company is outside the reviewed SEC collection scope.");
      if (knownCik && knownCik !== company.cik) throw new Error(`SEC CIK does not match the reviewed target for ${company.ticker}.`);
      const url = `${BASE}CIK${company.cik}.json`;
      if (cache.has(url)) return cache.get(url);
      const payload = await requestJson(url);
      const result = normalizeSecCompanyFacts(payload, company, new Date(), profile);
      if (!result.facts.length) throw Object.assign(new Error(`SEC returned no tracked 10-K/10-Q facts for ${company.ticker}.`), { code: "sec-no-facts" });
      cache.set(url, result);
      return result;
    },
    async collect(companies) {
      const targets = companies ?? await this.resolveCompanies();
      const output = [];
      for (const company of targets) {
        const profile = await this.fetchSubmissions(company);
        const snapshot = await this.fetchCompany(company, { profile });
        output.push({ ...snapshot, profile });
      }
      return output;
    },
  };
}

import { isValidMarketDate } from "../financial-market.mjs";

const API = "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo";
const STOCKS = [
  ["005930", "삼성전자", "KOSPI"], ["000660", "SK하이닉스", "KOSPI"], ["005380", "현대차", "KOSPI"],
  ["035420", "NAVER", "KOSPI"], ["035720", "카카오", "KOSPI"], ["373220", "LG에너지솔루션", "KOSPI"],
];
const dec = (value) => {
  if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)) return value;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return String(value);
  return null;
};
const signedDec = (value) => typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value) ? value : typeof value === "number" && Number.isFinite(value) ? String(value) : null;

/** Internal adapter for parsing the FSC/KRX public-data response. Its license excludes commercial use and redistribution. */
export function createFscKrxStockProvider({ serviceKey = process.env.DATA_GO_KR_STOCK_KEY, fetchImpl = fetch, now = () => new Date(), wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  async function request(params, signal) {
    if (!serviceKey) throw Object.assign(new Error("data.go.kr service key is not configured"), { code: "provider-not-configured" });
    const url = new URL(API);
    for (const [key, value] of Object.entries({ serviceKey, resultType: "json", numOfRows: 1000, pageNo: 1, ...params })) url.searchParams.set(key, String(value));
    const response = await fetchImpl(url, { headers: { accept: "application/json" }, signal });
    if (!response.ok) throw Object.assign(new Error("FSC/KRX stock price request failed"), { status: response.status, retryAfterMs: Number(response.headers.get("retry-after")) * 1000 || undefined });
    const body = await response.json();
    const result = body?.response;
    const code = result?.header?.resultCode;
    if (code && code !== "00" && code !== "000") throw Object.assign(new Error("FSC/KRX stock API returned an error"), { status: code === "23" ? 429 : 400 });
    const items = result?.body?.items?.item ?? [];
    if (!Array.isArray(items)) throw new Error("Invalid FSC/KRX stock response schema");
    return items;
  }
  return {
    id: "fsc-krx-stock-prices", datasetId: "fsc-krx-daily-stock-prices", providerName: "Financial Services Commission / KRX Stock Prices",
    sourceUrl: "https://www.data.go.kr/data/15094808/openapi.do", attribution: "Source: Financial Services Commission / Korea Exchange",
    assetType: "stock", market: "kr", marketTimezone: "Asia/Seoul", licenseStatus: "unverified",
    async fetchMarkets() { return STOCKS.map(([symbol, name, market]) => ({ market, symbol, name, quoteCurrency: "KRW", baseCurrency: symbol, venue: market })); },
    async fetchTickers(markets = STOCKS.map(([symbol]) => symbol), { signal } = {}) {
      const output = [];
      for (const symbol of [...new Set(markets)].filter((item) => STOCKS.some(([ticker]) => ticker === item))) {
        const [row] = await request({ likeSrtnCd: symbol, numOfRows: 1 }, signal);
        if (row && row.srtnCd !== symbol) throw new Error("FSC/KRX returned an unrequested stock");
        if (row) output.push({ market: row.mrktCtg, symbol, venue: row.mrktCtg, currency: "KRW", price: dec(row.clpr),
          changePercent: signedDec(row.fltRt), changeWindow: "session", volume: dec(row.trqu), marketCap: dec(row.mrktTotAmt), asOf: /^\d{8}$/.test(row.basDt) ? `${row.basDt.slice(0, 4)}-${row.basDt.slice(4, 6)}-${row.basDt.slice(6)}` : null });
        await wait(1100);
      }
      return output;
    },
    async fetchDailyPrices({ startDate, endDate, signal, limit = STOCKS.length }) {
      if (!isValidMarketDate(startDate) || !isValidMarketDate(endDate) || startDate > endDate) throw new Error("Invalid FSC/KRX date range");
      const assets = [], prices = [], fetchedAt = now().toISOString();
      for (const [symbol, name, listedMarket] of STOCKS.slice(0, Math.max(1, Math.min(STOCKS.length, Math.trunc(Number(limit) || STOCKS.length))))) {
        assets.push({ sourceAssetId: symbol, assetType: "stock", symbol, name, venue: listedMarket, countryCode: "KR", currency: "KRW", unit: "share", timezone: "Asia/Seoul", metadata: {} });
        const rows = await request({ likeSrtnCd: symbol, beginBasDt: startDate.replaceAll("-", ""), endBasDt: endDate.replaceAll("-", ""), numOfRows: 1000 }, signal);
        for (const row of rows) {
          if (row.srtnCd !== symbol || !/^\d{8}$/.test(row.basDt)) throw new Error("FSC/KRX returned an invalid stock/date");
          const referenceDate = `${row.basDt.slice(0, 4)}-${row.basDt.slice(4, 6)}-${row.basDt.slice(6)}`;
          const values = [row.mkp, row.hipr, row.lopr, row.clpr, row.trqu, row.mrktTotAmt].map(dec);
          if (values.slice(0, 4).some((value) => value === null)) throw new Error("Invalid FSC/KRX OHLC values");
          prices.push({ sourceAssetId: symbol, referenceDate, referenceTimezone: "Asia/Seoul", priceKind: "close", open: values[0], high: values[1], low: values[2], close: values[3], volume: values[4], marketCap: values[5], isAdjusted: false, fetchedAt, sourceUpdatedAt: null });
        }
        await wait(1100);
      }
      return { assets, prices, snapshotVersion: fetchedAt };
    },
  };
}

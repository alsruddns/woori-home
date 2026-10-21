import type { StockMarketId, StockSnapshot } from "./registry";

// Development-only fixtures. Never merge these values into src/data/world-bank.json or production market snapshots.
export const mockStockSnapshots: Partial<Record<StockMarketId, StockSnapshot>> = {
  us: { market: "us", asOf: "2026-10-19", licensedSource: "DEVELOPMENT MOCK — no licensed source", currency: "USD", securities: [
    { symbol: "ALP", name: "Atlas Systems", sector: "Technology", marketCap: 3400, changePercent: 1.8 }, { symbol: "NTH", name: "Northstar Cloud", sector: "Technology", marketCap: 2100, changePercent: -0.7 }, { symbol: "HBR", name: "Harbor Health", sector: "Health", marketCap: 1200, changePercent: 0.9 }, { symbol: "PNE", name: "Pioneer Energy", sector: "Energy", marketCap: 830, changePercent: -1.3 }, { symbol: "MRC", name: "Meridian Retail", sector: "Consumer", marketCap: 650, changePercent: 0.4 }, { symbol: "CST", name: "Coastline Bank", sector: "Finance", marketCap: 590, changePercent: -0.2 },
  ] },
  kospi: { market: "kospi", asOf: "2026-10-19", licensedSource: "DEVELOPMENT MOCK — no licensed source", currency: "KRW", securities: [
    { symbol: "KOR-A", name: "Han River Devices", sector: "Technology", marketCap: 830, changePercent: 1.2 }, { symbol: "KOR-B", name: "Seoul Mobility", sector: "Industrials", marketCap: 510, changePercent: -0.8 }, { symbol: "KOR-C", name: "Blue Pine Finance", sector: "Finance", marketCap: 390, changePercent: 0.5 }, { symbol: "KOR-D", name: "East Gate Energy", sector: "Energy", marketCap: 240, changePercent: -1.1 },
  ] },
  kosdaq: { market: "kosdaq", asOf: "2026-10-19", licensedSource: "DEVELOPMENT MOCK — no licensed source", currency: "KRW", securities: [{ symbol: "Q-A", name: "Lab One", sector: "Health", marketCap: 92, changePercent: 2.4 }, { symbol: "Q-B", name: "Pixel Forge", sector: "Technology", marketCap: 78, changePercent: -1.5 }, { symbol: "Q-C", name: "Green Current", sector: "Energy", marketCap: 45, changePercent: 0.6 }] },
  japan: { market: "japan", asOf: "2026-10-19", licensedSource: "DEVELOPMENT MOCK — no licensed source", currency: "JPY", securities: [{ symbol: "JPN-A", name: "Kumo Industries", sector: "Industrials", marketCap: 1600, changePercent: 0.8 }, { symbol: "JPN-B", name: "Sakura Robotics", sector: "Technology", marketCap: 1100, changePercent: 1.6 }, { symbol: "JPN-C", name: "Mizu Finance", sector: "Finance", marketCap: 720, changePercent: -0.6 }] },
  europe: { market: "europe", asOf: "2026-10-19", licensedSource: "DEVELOPMENT MOCK — no licensed source", currency: "EUR", securities: [{ symbol: "EUR-A", name: "Alpine Works", sector: "Industrials", marketCap: 1400, changePercent: -0.4 }, { symbol: "EUR-B", name: "Lumen Systems", sector: "Technology", marketCap: 900, changePercent: 1.1 }, { symbol: "EUR-C", name: "Union Markets", sector: "Finance", marketCap: 670, changePercent: 0.3 }] },
};

export function snapshotDatesForMarket(market: StockMarketId) {
  const snapshot = mockStockSnapshots[market];
  return snapshot ? [snapshot.asOf] : [];
}

export function stockSnapshotForDate(market: StockMarketId, date: string) {
  const snapshot = mockStockSnapshots[market];
  return snapshot?.asOf === date ? snapshot : undefined;
}

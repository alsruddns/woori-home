const ASSETS = Object.freeze([
  ["Qwsogvtv82FCd", "BTC", "Bitcoin", ["bitcoin", "비트코인"]],
  ["razxDUgYGNAdQ", "ETH", "Ethereum", ["ethereum", "이더리움"]],
  ["-l8Mn2pVlRs-p", "XRP", "XRP", ["ripple", "리플"]],
  ["WcwrkfNI4FUAe", "BNB", "BNB", ["binance coin", "바이낸스코인"]],
  ["zNZHO_Sjf", "SOL", "Solana", ["solana", "솔라나"]],
  ["a91GCGd_u96cF", "DOGE", "Dogecoin", ["dogecoin", "도지코인"]],
  ["qzawljRxB5bYu", "ADA", "Cardano", ["cardano", "에이다"]],
  ["qUhEFk1I61atv", "TRX", "TRON", ["tron", "트론"]],
  ["dvUj0CzDZ", "AVAX", "Avalanche", ["avalanche", "아발란체"]],
  ["VLqpJwogdhHNb", "LINK", "Chainlink", ["chainlink", "체인링크"]],
  ["25W7FG7om", "DOT", "Polkadot", ["polkadot", "폴카닷"]],
  ["D7B1x_ks7WhV5", "LTC", "Litecoin", ["litecoin", "라이트코인"]],
  ["ZlZpzOJo43mIo", "BCH", "Bitcoin Cash", ["bitcoin cash", "비트코인캐시"]],
  ["f3iaFeCKEmkaZ", "XLM", "Stellar", ["stellar", "스텔라"]],
  ["hnfQfsYfeIGUQ", "ETC", "Ethereum Classic", ["ethereum classic", "이더리움클래식"]],
  ["Knsels4_Ol-Ny", "ATOM", "Cosmos", ["cosmos", "코스모스"]],
  ["_H5FVG9iW", "UNI", "Uniswap", ["uniswap", "유니스왑"]],
  ["DCrsaMv68", "NEAR", "NEAR Protocol", ["near protocol", "니어"]],
  ["ymQub4fuB", "FIL", "Filecoin", ["filecoin", "파일코인"]],
  ["HGYj5JCv5", "APT", "Aptos", ["aptos", "앱토스"]],
]);

const byUuid = new Map(ASSETS.map(([uuid, symbol, name, aliases]) => [uuid, { uuid, symbol, name, aliases }]));
const DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i;
const decimal = (value) => (typeof value === "string" && DECIMAL.test(value) && Number.isFinite(Number(value)) || typeof value === "number" && Number.isFinite(value)) ? String(value) : null;

function providerError(response) {
  const retryAfter = Number(response.headers.get("retry-after"));
  return Object.assign(new Error("Coinranking API request failed"), {
    status: response.status,
    retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 3600) : null,
  });
}

export function createCoinrankingProvider({ apiKey = process.env.COINRANKING_API_KEY, fetchImpl = fetch, now = () => new Date() } = {}) {
  async function get(path, params, signal) {
    if (!apiKey) throw Object.assign(new Error("Coinranking API key is not configured"), { code: "provider-not-configured" });
    const url = new URL(`https://api.coinranking.com/v2${path}`);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (Array.isArray(value)) for (const item of value) url.searchParams.append(key, String(item));
      else url.searchParams.set(key, String(value));
    }
    const response = await fetchImpl(url, { headers: { accept: "application/json", "x-access-token": apiKey }, signal, cache: "no-store" });
    if (!response.ok) throw providerError(response);
    const payload = await response.json();
    if (payload?.status !== "success" || !payload?.data) throw new Error("Invalid Coinranking response");
    return payload.data;
  }

  return {
    id: "coinranking-aggregate", providerName: "Coinranking", sourceUrl: "https://coinranking.com/",
    attribution: "Data provided by Coinranking", currency: "USD", assets: ASSETS.map(([uuid, symbol, name, aliases]) => ({ uuid, symbol, name, aliases })),
    async fetchQuotes({ signal } = {}) {
      const data = await get("/coins", { "uuids[]": ASSETS.map(([uuid]) => uuid), timePeriod: "24h" }, signal);
      if (!Array.isArray(data.coins)) throw new Error("Invalid Coinranking coins payload");
      const observedAt = now().toISOString();
      return {
        provider: "Coinranking", sourceUrl: "https://coinranking.com/", attribution: "Data provided by Coinranking",
        currency: "USD", quoteType: "aggregated-market-price", observedAt,
        data: data.coins.flatMap((coin) => {
          const asset = byUuid.get(coin.uuid);
          if (!asset) return [];
          const price = decimal(coin.price);
          if (price === null || Number(price) <= 0) return [];
          return [{ ...asset, price, change24hPercent: decimal(coin.change), marketCap: decimal(coin.marketCap), volume24h: decimal(coin['24hVolume']), observedAt }];
        }),
      };
    },
    async fetchPriceHistory(uuid, timePeriod = "7d", { signal } = {}) {
      if (!byUuid.has(uuid)) throw new Error("Unknown Coinranking asset UUID");
      if (!["7d", "30d", "3m", "1y"].includes(timePeriod)) throw new Error("Unsupported Coinranking history period");
      const data = await get(`/coin/${encodeURIComponent(uuid)}/price-history`, { timePeriod }, signal);
      if (!Array.isArray(data.history)) throw new Error("Invalid Coinranking history payload");
      return data.history.flatMap((point) => {
        const timestamp = Number(point?.timestamp);
        const price = decimal(point?.price);
        if (!Number.isInteger(timestamp) || price === null || Number(price) <= 0) return [];
        return [{ timestamp: new Date(timestamp * 1000).toISOString(), price }];
      });
    },
  };
}

export const coinrankingAssetUuids = Object.freeze(ASSETS.map(([uuid]) => uuid));

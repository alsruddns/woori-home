const ASSETS = Object.freeze([
  ["Qwsogvtv82FCd", "BTC", "Bitcoin", ["bitcoin", "\uBE44\uD2B8\uCF54\uC778"]],
  ["razxDUgYGNAdQ", "ETH", "Ethereum", ["ethereum", "\uC774\uB354\uB9AC\uC6C0"]],
  ["-l8Mn2pVlRs-p", "XRP", "XRP", ["ripple", "\uB9AC\uD50C", "\uC5D1\uC2A4\uC54C\uD53C"]],
  ["WcwrkfNI4FUAe", "BNB", "BNB", ["binance coin", "\uBC14\uC774\uB0B8\uC2A4 \uCF54\uC778"]],
  ["zNZHO_Sjf", "SOL", "Solana", ["solana", "\uC194\uB77C\uB098"]],
  ["a91GCGd_u96cF", "DOGE", "Dogecoin", ["dogecoin", "\uB3C4\uC9C0\uCF54\uC778", "\uB3C4\uC9C0"]],
  ["qzawljRxB5bYu", "ADA", "Cardano", ["cardano", "\uC5D0\uC774\uB2E4", "\uCE74\uB974\uB2E4\uB178"]],
  ["qUhEFk1I61atv", "TRX", "TRON", ["tron", "\uD2B8\uB860"]],
  ["dvUj0CzDZ", "AVAX", "Avalanche", ["avalanche", "\uC544\uBC1C\uB780\uCCB4"]],
  ["VLqpJwogdhHNb", "LINK", "Chainlink", ["chainlink", "\uCCB4\uC778\uB9C1\uD06C"]],
  ["25W7FG7om", "DOT", "Polkadot", ["polkadot", "\uD3F4\uCE74\uB2F7"]],
  ["D7B1x_ks7WhV5", "LTC", "Litecoin", ["litecoin", "\uB77C\uC774\uD2B8\uCF54\uC778"]],
  ["ZlZpzOJo43mIo", "BCH", "Bitcoin Cash", ["bitcoin cash", "\uBE44\uD2B8\uCF54\uC778 \uCE90\uC2DC"]],
  ["f3iaFeCKEmkaZ", "XLM", "Stellar", ["stellar", "\uC2A4\uD154\uB77C"]],
  ["hnfQfsYfeIGUQ", "ETC", "Ethereum Classic", ["ethereum classic", "\uC774\uB354\uB9AC\uC6C0 \uD074\uB798\uC2DD"]],
  ["Knsels4_Ol-Ny", "ATOM", "Cosmos", ["cosmos", "\uCF54\uC2A4\uBAA8\uC2A4"]],
  ["_H5FVG9iW", "UNI", "Uniswap", ["uniswap", "\uC720\uB2C8\uC2A4\uC651"]],
  ["DCrsaMv68", "NEAR", "NEAR Protocol", ["near protocol", "\uB2C8\uC5B4 \uD504\uB85C\uD1A0\uCF5C"]],
  ["ymQub4fuB", "FIL", "Filecoin", ["filecoin", "\uD30C\uC77C\uCF54\uC778"]],
  ["HGYj5JCv5", "APT", "Aptos", ["aptos", "\uC571\uD1A4\uC2A4"]],
]);

const byUuid = new Map(ASSETS.map(([uuid, symbol, name, aliases]) => [uuid, { uuid, symbol, name, aliases }]));
const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i;
function decimal(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  const match = String(value).trim().match(DECIMAL);
  if (!match) return null;
  const [, sign, whole, fraction = "", exponentValue = "0"] = match;
  const exponent = Number(exponentValue);
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 40) return null;
  let digits = `${whole}${fraction}`;
  let decimalAt = whole.length + exponent;
  if (decimalAt <= 0) {
    digits = `${"0".repeat(Math.min(40, -decimalAt))}${digits}`;
    decimalAt = 0;
  } else if (decimalAt > digits.length) {
    digits = `${digits}${"0".repeat(Math.min(40, decimalAt - digits.length))}`;
  }
  let integer = decimalAt === 0 ? "0" : digits.slice(0, decimalAt);
  let decimals = decimalAt === 0 ? digits : digits.slice(decimalAt);
  integer = integer.replace(/^0+(?=\d)/, "");
  decimals = decimals.slice(0, 10).replace(/0+$/, "");
  if (integer.length > 30) return null;
  const result = `${sign}${integer}${decimals ? `.${decimals}` : ""}`;
  return Number.isFinite(Number(result)) ? result : null;
}

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
    return { ...payload.data, pagination: payload.pagination ?? payload.data.pagination };
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
    async fetchTopMarketSnapshot({ limit = 300, signal, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 300) throw new Error("Coinranking daily snapshots are limited to the top 300 assets.");
      const coins = [];
      const seen = new Set();
      let cursor;
      let requests = 0;
      while (coins.length < limit) {
        if (requests > 0) await wait(250);
        const data = await get("/coins", {
          limit: Math.min(100, limit - coins.length),
          orderBy: "marketCap",
          orderDirection: "desc",
          referenceCurrencyUuid: "yhjMzLPhuIDl",
          timePeriod: "24h",
          ...(cursor ? { cursor } : {}),
        }, signal);
        requests += 1;
        if (!Array.isArray(data.coins)) throw new Error("Invalid Coinranking market snapshot page.");
        for (const coin of data.coins) {
          if (typeof coin?.uuid !== "string" || !/^[A-Za-z0-9_-]{1,180}$/.test(coin.uuid) || seen.has(coin.uuid)) throw new Error("Coinranking pagination returned a duplicate or missing UUID.");
          const price = decimal(coin.price);
          const marketCap = decimal(coin.marketCap);
          const volume24h = coin["24hVolume"] == null ? null : decimal(coin["24hVolume"]);
          const change24hPercent = coin.change == null ? null : decimal(coin.change);
          if (typeof coin.name !== "string" || !coin.name.trim() || typeof coin.symbol !== "string" || !/^[A-Z0-9._-]{1,40}$/.test(coin.symbol)
            || price === null || Number(price) <= 0 || marketCap === null || Number(marketCap) <= 0
            || (coin["24hVolume"] != null && (volume24h === null || Number(volume24h) < 0))
            || (coin.change != null && change24hPercent === null)) {
            throw new Error(`Invalid Coinranking market fields for asset ${String(coin.uuid).slice(0, 40)}.`);
          }
          seen.add(coin.uuid);
          coins.push({ uuid: coin.uuid, name: coin.name.trim(), symbol: coin.symbol, price, change24hPercent, marketCap, volume24h });
          if (coins.length === limit) break;
        }
        if (!data.pagination?.hasNextPage || !data.pagination?.nextCursor) break;
        cursor = data.pagination.nextCursor;
      }
      if (coins.length !== limit) throw new Error(`Coinranking returned ${coins.length} validated assets; ${limit} are required.`);
      return {
        provider: "Coinranking", sourceUrl: "https://coinranking.com/", attribution: "Data provided by Coinranking",
        currency: "USD", quoteType: "daily-observed-aggregate-price", quoteWindow: "24h",
        observedAt: now().toISOString(), requestCount: requests, data: coins,
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

export function getCoinrankingAssetAliases(uuid) {
  const asset = byUuid.get(uuid);
  return asset ? [...asset.aliases] : [];
}

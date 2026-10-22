import "server-only";
import { getFinancialReadOnlyPool } from "./financial-readonly";

const sortColumns: Record<string, string> = {
  symbol: "a.symbol", name: "a.name", close: "latest.close", changePercent: '"changePercent"',
  volume: "latest.volume", marketCap: "latest.market_cap",
};

export type FinancialListOptions = {
  type: string; market?: string | null; search?: string; sort: string; order: "asc" | "desc"; limit: number; offset: number; referenceDate?: string | null;
};

const rowsSql = (dateParameter: number) => `select a.id, a.asset_type as "assetType", a.symbol, a.name, a.venue, a.country_code as "countryCode",
  a.currency, a.unit, a.timezone, a.sector, s.id as "sourceId", s.name as "sourceName", s.source_url as "sourceUrl",
  s.attribution, latest.reference_date as "referenceDate", latest.reference_timezone as "referenceTimezone",
  latest.price_kind as "priceKind", latest.open::text as open, latest.high::text as high, latest.low::text as low,
  latest.close::text as close, latest.volume::text as volume, latest.market_cap::text as "marketCap",
  latest.is_adjusted as "isAdjusted", latest.fetched_at as "fetchedAt",
  previous.reference_date as "previousReferenceDate", previous.close::text as "previousClose",
  case when previous.close > 0 then round((latest.close - previous.close) / previous.close * 100, 8)::text else null end as "changePercent"
  from financial_assets a
  join data_sources s on s.id=a.source_id and s.license_status='verified'
  left join lateral (select p.* from financial_daily_prices p where p.asset_id=a.id and p.source_id=a.source_id and ($${dateParameter}::text is null or p.reference_date <= $${dateParameter}::text) order by p.reference_date desc limit 1) latest on true
  left join lateral (select p.* from financial_daily_prices p where p.asset_id=a.id and p.source_id=a.source_id and p.price_kind=latest.price_kind and p.reference_date < latest.reference_date order by p.reference_date desc limit 1) previous on true`;

function assetFilters(options: FinancialListOptions) {
  const values: unknown[] = [options.type];
  const filters = ["a.asset_type=$1", "a.is_active=true"];
  if (options.market === "us" || options.market === "kr") {
    values.push(options.market.toUpperCase());
    filters.push(`a.country_code=$${values.length}`);
  } else if (options.market === "krw" || options.market === "usd") {
    values.push(options.market.toUpperCase());
    filters.push(`a.currency=$${values.length}`);
  }
  const search = options.search?.trim();
  if (search) {
    values.push(`%${search.replace(/[\\%_]/g, (character) => `\\${character}`)}%`);
    filters.push(`(a.symbol ilike $${values.length} escape '\\' or a.name ilike $${values.length} escape '\\')`);
  }
  return { where: filters.join(" and "), values };
}

export async function listFinancialMarketAssets(options: FinancialListOptions) {
  const { where, values } = assetFilters(options);
  const pool = getFinancialReadOnlyPool();
  const dateParameter = values.length + 1;
  const listValues = [...values, options.referenceDate ?? null];
  const [count, rows] = await Promise.all([
    pool.query(`select count(*)::int as total from financial_assets a join data_sources s on s.id=a.source_id and s.license_status='verified' where ${where}`, values),
    pool.query(`${rowsSql(dateParameter)} where ${where} order by ${sortColumns[options.sort] ?? "a.symbol"} ${options.order === "desc" ? "desc" : "asc"} nulls last, a.symbol asc limit $${values.length + 2} offset $${values.length + 3}`, [...listValues, options.limit, options.offset]),
  ]);
  return { rows: rows.rows, total: count.rows[0]?.total ?? 0 };
}

export async function getFinancialOverview() {
  const pool = getFinancialReadOnlyPool();
  const result = await pool.query(`select a.asset_type as "assetType", a.country_code as "countryCode", a.currency,
    count(*)::int as "assetCount", count(latest.reference_date)::int as "pricedAssetCount", max(latest.reference_date) as "latestDate",
    max(latest.fetched_at) as "lastFetchedAt"
    from financial_assets a join data_sources s on s.id=a.source_id and s.license_status='verified'
    left join lateral (select p.reference_date,p.fetched_at from financial_daily_prices p where p.asset_id=a.id and p.source_id=a.source_id order by p.reference_date desc limit 1) latest on true
    where a.is_active=true group by a.asset_type,a.country_code,a.currency order by a.asset_type,a.country_code nulls last,a.currency`);
  return result.rows;
}

export async function getFinancialHistory(assetId: string, options: { from?: string | null; to?: string | null; limit: number }) {
  const result = await getFinancialReadOnlyPool().query(`select p.reference_date as "referenceDate",p.reference_timezone as "referenceTimezone",
    p.price_kind as "priceKind",p.open::text as open,p.high::text as high,p.low::text as low,p.close::text as close,
    p.volume::text as volume,p.market_cap::text as "marketCap",p.is_adjusted as "isAdjusted",p.fetched_at as "fetchedAt",
    s.id as "sourceId",s.name as "sourceName",s.source_url as "sourceUrl",s.attribution
    from financial_daily_prices p join financial_assets a on a.id=p.asset_id and a.source_id=p.source_id
    join data_sources s on s.id=p.source_id and s.license_status='verified'
    where p.asset_id=$1 and ($2::text is null or p.reference_date >= $2::text) and ($3::text is null or p.reference_date <= $3::text)
    order by p.reference_date desc limit $4`, [assetId, options.from ?? null, options.to ?? null, options.limit]);
  return result.rows;
}

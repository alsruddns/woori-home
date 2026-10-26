import { validateMarketPriceRecord } from "./financial-market.mjs";

/** Caller owns the transaction and rights lock. No inserts outside the existing price table. */
export async function upsertFinancialPrice(client, record) {
  const validation = validateMarketPriceRecord(record);
  if (!validation.ok) throw new Error(`Financial price rejected: ${validation.reason}`);
  return client.query(`insert into financial_daily_prices
    (asset_id,source_id,dataset_id,reference_date,reference_timezone,price_kind,open,high,low,close,volume,market_cap,
      quote_change_percent,quote_window,is_adjusted,fetched_at,source_updated_at,updated_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now())
    on conflict (asset_id,source_id,reference_date,price_kind) do update set
      dataset_id=excluded.dataset_id,reference_timezone=excluded.reference_timezone,open=excluded.open,high=excluded.high,
      low=excluded.low,close=excluded.close,volume=excluded.volume,market_cap=excluded.market_cap,
      quote_change_percent=excluded.quote_change_percent,quote_window=excluded.quote_window,is_adjusted=excluded.is_adjusted,
      fetched_at=excluded.fetched_at,source_updated_at=excluded.source_updated_at,updated_at=now()
    where coalesce(excluded.source_updated_at,excluded.fetched_at) >= coalesce(financial_daily_prices.source_updated_at,financial_daily_prices.fetched_at)
      and (financial_daily_prices.dataset_id,financial_daily_prices.reference_timezone,financial_daily_prices.open,
        financial_daily_prices.high,financial_daily_prices.low,financial_daily_prices.close,financial_daily_prices.volume,
        financial_daily_prices.market_cap,financial_daily_prices.quote_change_percent,financial_daily_prices.quote_window,
        financial_daily_prices.is_adjusted,financial_daily_prices.fetched_at,financial_daily_prices.source_updated_at)
      is distinct from (excluded.dataset_id,excluded.reference_timezone,excluded.open,excluded.high,excluded.low,excluded.close,
        excluded.volume,excluded.market_cap,excluded.quote_change_percent,excluded.quote_window,excluded.is_adjusted,
        excluded.fetched_at,excluded.source_updated_at)
    returning (xmax=0) as was_inserted`, [record.assetId, record.sourceId, record.datasetId, record.referenceDate,
    record.referenceTimezone, record.priceKind, record.open ?? null, record.high ?? null, record.low ?? null,
    record.close, record.volume ?? null, record.marketCap ?? null, record.quoteChangePercent ?? null,
    record.quoteWindow ?? null, record.isAdjusted ?? false, record.fetchedAt, record.sourceUpdatedAt ?? null]);
}

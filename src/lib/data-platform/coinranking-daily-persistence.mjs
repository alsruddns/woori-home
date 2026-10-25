/** Persist one rights-approved Coinranking observation set; caller owns the transaction. */
export async function upsertCoinrankingDailySnapshot(client, normalized) {
  const assetIds = new Map();
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  for (const asset of normalized.assets) {
    const result = await client.query(`insert into financial_assets
      (source_id,source_asset_id,asset_type,symbol,name,venue,country_code,currency,unit,timezone,is_active,metadata,last_updated_at)
      values ($1,$2,$3,$4,$5,$6,null,$7,$8,$9,$10,$11::jsonb,$12)
      on conflict (source_id,source_asset_id) do update set asset_type=excluded.asset_type,symbol=excluded.symbol,name=excluded.name,
        venue=excluded.venue,currency=excluded.currency,unit=excluded.unit,timezone=excluded.timezone,is_active=excluded.is_active,
        metadata=excluded.metadata,last_updated_at=excluded.last_updated_at
      where (financial_assets.asset_type,financial_assets.symbol,financial_assets.name,financial_assets.venue,financial_assets.currency,
        financial_assets.unit,financial_assets.timezone,financial_assets.is_active,financial_assets.metadata)
        is distinct from (excluded.asset_type,excluded.symbol,excluded.name,excluded.venue,excluded.currency,
        excluded.unit,excluded.timezone,excluded.is_active,excluded.metadata)
      returning id`, [normalized.sourceId, asset.sourceAssetId, asset.assetType, asset.symbol, asset.name, asset.venue,
      asset.currency, asset.unit, asset.timezone, asset.isActive, JSON.stringify(asset.metadata), normalized.observedAt]);
    let assetId = result.rows[0]?.id;
    if (!assetId) {
      const existing = await client.query("select id from financial_assets where source_id=$1 and source_asset_id=$2", [normalized.sourceId, asset.sourceAssetId]);
      assetId = existing.rows[0]?.id;
      if (!assetId) throw new Error("Coinranking asset upsert returned no identity.");
    }
    assetIds.set(asset.sourceAssetId, assetId);
  }
  for (const price of normalized.prices) {
    const result = await client.query(`insert into financial_daily_prices
      (asset_id,source_id,dataset_id,reference_date,reference_timezone,price_kind,open,high,low,close,volume,market_cap,
        quote_change_percent,quote_window,is_adjusted,fetched_at,source_updated_at,updated_at)
      values ($1,$2,$3,$4,$5,$6,null,null,null,$7,$8,$9,$10,$11,false,$12,null,$12)
      on conflict (asset_id,source_id,reference_date,price_kind) do update set dataset_id=excluded.dataset_id,
        reference_timezone=excluded.reference_timezone,open=null,high=null,low=null,close=excluded.close,volume=excluded.volume,
        market_cap=excluded.market_cap,quote_change_percent=excluded.quote_change_percent,quote_window=excluded.quote_window,
        is_adjusted=false,fetched_at=excluded.fetched_at,source_updated_at=null,updated_at=excluded.updated_at
      where excluded.fetched_at >= financial_daily_prices.fetched_at and
        (financial_daily_prices.dataset_id,financial_daily_prices.reference_timezone,financial_daily_prices.close,
          financial_daily_prices.volume,financial_daily_prices.market_cap,financial_daily_prices.quote_change_percent,
          financial_daily_prices.quote_window,financial_daily_prices.fetched_at)
        is distinct from (excluded.dataset_id,excluded.reference_timezone,excluded.close,excluded.volume,excluded.market_cap,
          excluded.quote_change_percent,excluded.quote_window,excluded.fetched_at)
      returning (xmax=0) as was_inserted`, [assetIds.get(price.sourceAssetId), normalized.sourceId, normalized.datasetId,
      price.referenceDate, price.referenceTimezone, price.priceKind, price.close, price.volume, price.marketCap,
      price.quoteChangePercent, price.quoteWindow, price.fetchedAt]);
    if (!result.rows.length) unchanged += 1;
    else if (result.rows[0].was_inserted) inserted += 1;
    else updated += 1;
  }
  return { inserted, updated, unchanged, count: normalized.prices.length };
}

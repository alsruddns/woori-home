import { OPEN_PRICE_SOURCES, openSourceRights } from './open-price-sources.mjs';
import { evaluatePriceOperation } from './financial-price-policy.mjs';
import { upsertFinancialPrice } from './financial-price-upsert.mjs';

/** Only these two reviewed source identities may be registered. Existing sources are never updated. */
export async function registerOpenPriceCatalog(client) {
  for(const [kind,s] of Object.entries(OPEN_PRICE_SOURCES)) {
    await client.query(`insert into data_sources(id,name,provider,source_url,license_status,license_name,license_url,financial_rights,
      terms_version,reviewed_at,review_due_at,collection_enabled,attribution,rights_note)
      values($1,$2,$2,$3,'verified',$4,$5,$6::jsonb,$5,'2026-10-26T21:00:00Z','2027-04-26T21:00:00Z',true,$7,$8)
      on conflict(id) do nothing`,[s.id,s.name,s.url,s.license,s.terms,JSON.stringify(openSourceRights(s)),s.attribution,
      kind==='gold'?'Only published monthly nominal USD gold averages, not real-time gold or LBMA daily benchmark redistribution.':'API aggregate observations only. Coinranking and Binance rights and research data remain unchanged.']);
    await client.query(`insert into datasets(id,source_id,name,category,reference_period_kind,source_url)
      values($1,$2,$3,'finance',$4,$5) on conflict(id) do nothing`,[s.dataset,s.id,s.name,kind==='gold'?'month':'day',s.url]);
  }
}

export async function persistOpenPrices(client,kind,snapshot,{now=new Date(),manageTransaction=true}={}) {
  const s=OPEN_PRICE_SOURCES[kind];if(!s)throw new Error('Unknown open price kind');
  if(manageTransaction)await client.query('begin');
  try {
    await client.query('select pg_advisory_xact_lock(hashtext($1))',['woori-home:'+s.id]);
    const {rows:[source]}=await client.query('select * from data_sources where id=$1 for share',[s.id]);
    if(!evaluatePriceOperation(source,'collect',now).allowed)throw new Error('Open source rights blocked');
    const {rows:[dataset]}=await client.query('select id from datasets where id=$1 and source_id=$2',[s.dataset,s.id]);
    if(!dataset)throw new Error('Source dataset mismatch');
    const entries=kind==='gold'?[{id:'gold-monthly-usd',symbol:'XAU',name:'Gold',prices:snapshot.prices}]:snapshot.data.map(c=>({...c,prices:[{referenceDate:c.observedAt.slice(0,10),price:c.price,observedAt:c.observedAt}]}));
    if(!entries.length||entries.length>(kind==='gold'?1:20))throw new Error('Invalid snapshot size');
    let inserted=0,updated=0,unchanged=0;
    for(const asset of entries){
      const {rows:[saved]}=await client.query(`insert into financial_assets(source_id,source_asset_id,asset_type,symbol,name,venue,currency,unit,timezone,metadata,last_updated_at)
        values($1,$2,$3,$4,$5,$6,'USD',$7,'UTC',$8::jsonb,$9)
        on conflict(source_id,source_asset_id) do update set name=excluded.name,metadata=excluded.metadata,last_updated_at=excluded.last_updated_at
        where financial_assets.symbol=excluded.symbol and financial_assets.currency=excluded.currency and financial_assets.unit=excluded.unit
          and financial_assets.venue=excluded.venue and financial_assets.asset_type=excluded.asset_type returning id`,
      [s.id,asset.id,kind==='gold'?'metal':'crypto',asset.symbol,asset.name,s.name,kind==='gold'?'troy-ounce':'aggregate-price',JSON.stringify({rank:asset.rank??null,sourceUrl:snapshot.url,frequency:kind==='gold'?'month':'day',priceType:kind==='gold'?'monthly-average':'observed-aggregate-price'}),now.toISOString()]);
      if(!saved)throw new Error('Immutable asset identity mismatch');
      for(const p of asset.prices){
        const record={assetId:saved.id,sourceId:s.id,datasetId:s.dataset,referenceDate:p.referenceDate,referenceTimezone:'UTC',
          priceKind:kind==='gold'?'monthly-average':'quote-24h',close:p.price,volume:asset.volume??null,marketCap:asset.marketCap??null,
          quoteChangePercent:asset.change??null,quoteWindow:kind==='gold'?null:'24h',fetchedAt:now.toISOString(),sourceUpdatedAt:p.observedAt};
        // The same source observation/value is not rewritten merely because a collector ran again.
        const {rows:[existing]}=await client.query(`select close::numeric=$5::numeric and volume is not distinct from $6::numeric
          and market_cap is not distinct from $7::numeric and quote_change_percent is not distinct from $8::numeric
          and source_updated_at is not distinct from $9::timestamptz as identical from financial_daily_prices
          where asset_id=$1 and source_id=$2 and reference_date=$3 and price_kind=$4`,[saved.id,s.id,p.referenceDate,record.priceKind,p.price,record.volume,record.marketCap,record.quoteChangePercent,p.observedAt]);
        if(existing?.identical){unchanged++;continue;}
        const result=await upsertFinancialPrice(client,record);
        if(!result.rows.length)unchanged++;else if(result.rows[0].was_inserted)inserted++;else updated++;
      }
    }
    const {rows:[run]}=await client.query(`insert into data_collection_runs(dataset_id,started_at,finished_at,status,record_count,inserted_count,updated_count,skipped_count,latest_reference_period,scope)
      values($1,$2,now(),$3,$4,$5,$6,$7,$8,$9::jsonb) returning id`,[s.dataset,now.toISOString(),inserted+updated?'success':'unchanged',inserted+updated+unchanged,inserted,updated,unchanged,
      kind==='gold'?snapshot.prices.at(-1).referenceDate:snapshot.data[0].observedAt.slice(0,10),JSON.stringify({provider:s.id,url:snapshot.url,sha256:snapshot.checksum,apiRequests:kind==='gold'?2:1,inserted,updated,unchanged})]);
    if(manageTransaction)await client.query('commit');return {source:s.id,assets:entries.length,inserted,updated,unchanged,runId:run.id};
  }catch(e){if(manageTransaction)await client.query('rollback');throw e;}
}

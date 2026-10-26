import { OPEN_PRICE_SOURCES } from './open-price-sources.mjs';
import { evaluatePriceOperation } from './financial-price-policy.mjs';
export async function readOpenPriceMarket(client,kind,{now=new Date(),assetId=null,days=365}={}) {
  const s=OPEN_PRICE_SOURCES[kind];if(!s)throw new Error('Unknown open price market');
  const {rows:[source]}=await client.query('select * from data_sources where id=$1',[s.id]);
  if(!evaluatePriceOperation(source,'visualize',now).allowed)return {status:'provider-rights-pending',data:[]};
  const {rows}=await client.query(`select a.source_asset_id as uuid,a.symbol,a.name,a.metadata,p.reference_date as "referenceDate",
    p.close::text as price,p.volume::text as "volume24h",p.market_cap::text as "marketCap",p.quote_change_percent::text as "change24hPercent",
    p.source_updated_at as "observedAt",p.fetched_at as "collectedAt",p.price_kind as "priceKind"
    from financial_daily_prices p join financial_assets a on a.id=p.asset_id and a.source_id=p.source_id
    join data_sources s on s.id=p.source_id and s.license_status='verified' and s.financial_rights=$5::jsonb
      and s.terms_version=$6 and s.review_due_at > now()
    where p.source_id=$1 and p.dataset_id=$2 and a.is_active=true and a.currency='USD' and a.unit=$3
      and a.asset_type=$4 and p.price_kind=$7 and p.reference_timezone='UTC'
      and p.reference_date <= $8 and p.source_updated_at <= $9 and p.fetched_at <= $9
    order by p.reference_date desc,a.symbol limit 10000`,[s.id,s.dataset,kind==='gold'?'troy-ounce':'aggregate-price',kind==='gold'?'metal':'crypto',
    JSON.stringify(source.financial_rights),source.terms_version,kind==='gold'?'monthly-average':'quote-24h',now.toISOString().slice(0,10),now.toISOString()]);
  const latest=rows[0]?.referenceDate;
  const data=kind==='gold'?rows:assetId?rows.filter(r=>r.uuid===assetId&&new Date(r.referenceDate)>=new Date(now.getTime()-days*86400000)).reverse():rows.filter(r=>r.referenceDate===latest).sort((a,b)=>Number(a.metadata?.rank??999)-Number(b.metadata?.rank??999));
  return {status:data.length?'success':'no-verified-prices',provider:s.name,currency:'USD',unit:kind==='gold'?'troy-ounce':'aggregate-price',
    priceType:kind==='gold'?'monthly-average':'observed-aggregate-price',frequency:kind==='gold'?'month':'day',referenceDate:latest??null,
    observedAt:data[0]?.observedAt??null,sourceUrl:s.url,licenseUrl:s.terms,attribution:s.attribution,
    stale:data.length>0&&(kind==='gold'?now-new Date(latest)>70*86400000:now-new Date(data[0].observedAt)>36*3600000),
    data:data.map(r=>({...r,aliases:[],timestamp:r.observedAt}))};
}

import { evaluatePriceOperation, goldPricePerGram } from "./financial-price-policy.mjs";
import { GOLD_SOURCE_ID, GOLD_DATASET_ID } from "./gold-price-pipeline.mjs";

/** Database-only public projection. Neither an external API nor the research database is accessed. */
export async function readGoldMarket(client, { now = new Date() } = {}) {
  const { rows: [source] } = await client.query(`select s.id,s.name,s.license_status,s.financial_rights,s.terms_version,
    s.reviewed_at,s.review_due_at,s.collection_enabled,s.attribution,s.source_url
    from data_sources s join datasets d on d.source_id=s.id where s.id=$1 and d.id=$2`, [GOLD_SOURCE_ID, GOLD_DATASET_ID]);
  const policy = evaluatePriceOperation(source, "visualize", now);
  if (!policy.allowed) return { status: "provider-rights-pending", data: [], reasons: policy.reasons };
  const { rows } = await client.query(`select a.source_asset_id as "sourceAssetId",a.venue,a.currency,a.unit,
      p.reference_date as "referenceDate",p.reference_timezone as "referenceTimezone",p.price_kind as "priceKind",
      p.close::text as price,p.fetched_at as "collectedAt",p.source_updated_at as "observedAt"
    from financial_daily_prices p join financial_assets a on a.id=p.asset_id and a.source_id=p.source_id
    join data_sources s on s.id=p.source_id and s.license_status='verified' and s.financial_rights=$5::jsonb
      and s.terms_version=$6 and s.review_due_at > now()
    where p.source_id=$1 and p.dataset_id=$2 and a.asset_type='metal' and a.symbol='XAU' and a.is_active=true
      and a.currency='USD' and a.unit='troy-ounce' and p.price_kind='spot-reference' and p.reference_timezone='UTC'
      and p.reference_date <= $3 and p.source_updated_at <= $4 and p.fetched_at <= $4
    order by p.reference_date desc,p.source_updated_at desc limit 366`, [GOLD_SOURCE_ID, GOLD_DATASET_ID, now.toISOString().slice(0, 10), now.toISOString(), JSON.stringify(source.financial_rights), source.terms_version]);
  const data = rows.map((row) => ({ ...row, pricePerGram: goldPricePerGram(row.price, row.unit),
    providerId: source.id, providerName: source.name, sourceUrl: source.source_url,
    attribution: source.attribution, licenseReference: source.terms_version,
    stale: now.getTime() - new Date(row.observedAt).getTime() > 3 * 86_400_000 }));
  return { status: data.length ? "success" : "no-verified-prices", data };
}

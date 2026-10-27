import { OPEN_PRICE_SOURCES } from './open-price-sources.mjs';
import { evaluatePriceOperation } from './financial-price-policy.mjs';

const validUtcDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
  && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;

export async function readOpenPriceMarket(client, kind, { now = new Date(), assetId = null, date = null, days = 365 } = {}) {
  const sourceConfig = OPEN_PRICE_SOURCES[kind];
  if (!sourceConfig) throw new Error('Unknown open price market');
  if (date !== null && (!validUtcDate(date) || date > now.toISOString().slice(0, 10))) {
    return { status: 'invalid-date', data: [], history: [], referenceDate: date };
  }
  const { rows: [source] } = await client.query('select * from data_sources where id=$1', [sourceConfig.id]);
  if (!evaluatePriceOperation(source, 'visualize', now).allowed) return { status: 'provider-rights-pending', data: [], history: [] };

  const rights = JSON.stringify(source.financial_rights);
  const rightsClause = `join data_sources s on s.id=p.source_id and s.license_status='verified' and s.financial_rights=$2::jsonb
    and s.terms_version=$3 and s.review_due_at > now()`;
  const availableResult = await client.query(`select distinct p.reference_date::text as date
    from financial_daily_prices p ${rightsClause}
    where p.source_id=$1 and p.dataset_id=$4 and p.reference_timezone='UTC'
      and p.reference_date <= $5 and p.source_updated_at <= $6 and p.fetched_at <= $6
    order by p.reference_date desc limit 3660`, [sourceConfig.id, rights, source.terms_version, sourceConfig.dataset,
    now.toISOString().slice(0, 10), now.toISOString()]);
  const availableDates = availableResult.rows.map((row) => row.date);
  const latestDate = availableDates[0] ?? null;
  const referenceDate = date ?? latestDate;

  let rows = [];
  if (kind === 'gold') {
    const result = await client.query(`select a.source_asset_id as uuid,a.symbol,a.name,a.metadata,p.reference_date::text as "referenceDate",
      p.close::text as price,p.source_updated_at as "observedAt",p.fetched_at as "collectedAt",p.price_kind as "priceKind"
      from financial_daily_prices p join financial_assets a on a.id=p.asset_id and a.source_id=p.source_id ${rightsClause}
      where p.source_id=$1 and p.dataset_id=$4 and a.is_active=true and a.currency='USD' and a.unit='troy-ounce'
        and a.asset_type='metal' and p.price_kind='monthly-average' and p.reference_timezone='UTC'
        and p.reference_date <= $5 and p.source_updated_at <= $6 and p.fetched_at <= $6
      order by p.reference_date desc limit 10000`, [sourceConfig.id, rights, source.terms_version, sourceConfig.dataset,
      now.toISOString().slice(0, 10), now.toISOString()]);
    rows = result.rows;
  } else if (referenceDate) {
    const assetFilter = assetId ? 'and a.source_asset_id=$8' : '';
    const historyFilter = assetId ? 'and p.reference_date >= $9' : '';
    const historyStart = assetId ? new Date(Date.parse(`${referenceDate}T00:00:00.000Z`) - Math.min(Math.max(days, 1), 3650) * 86400000).toISOString().slice(0, 10) : null;
    const result = await client.query(`select a.source_asset_id as uuid,a.symbol,a.name,a.metadata,p.reference_date::text as "referenceDate",
      p.close::text as price,p.volume::text as "volume24h",p.market_cap::text as "marketCap",p.quote_change_percent::text as "change24hPercent",
      p.source_updated_at as "observedAt",p.fetched_at as "collectedAt",p.price_kind as "priceKind"
      from financial_daily_prices p join financial_assets a on a.id=p.asset_id and a.source_id=p.source_id
      ${rightsClause}
      where p.source_id=$1 and p.dataset_id=$4 and a.is_active=true and a.currency='USD' and a.unit='aggregate-price'
        and a.asset_type='crypto' and p.price_kind='quote-24h' and p.reference_timezone='UTC'
        and p.reference_date <= $5 and p.source_updated_at <= $6 and p.fetched_at <= $6
        and ($7::date is null or p.reference_date=$7) ${assetFilter} ${historyFilter}
      order by p.reference_date desc, coalesce((a.metadata->>'rank')::int,999999), a.symbol limit 10000`,
    [sourceConfig.id, rights, source.terms_version, sourceConfig.dataset, referenceDate, now.toISOString(), assetId ? null : referenceDate, ...(assetId ? [assetId, historyStart] : [])]);
    rows = result.rows;
  }

  const history = kind === 'crypto' && assetId ? [...rows].sort((a, b) => a.referenceDate.localeCompare(b.referenceDate)) : [];
  const data = kind === 'gold' ? rows : assetId ? rows.filter((row) => row.referenceDate === referenceDate) : rows;
  const status = data.length ? 'success' : 'no-observations-for-date';
  return {
    status,
    provider: sourceConfig.name,
    currency: 'USD',
    unit: kind === 'gold' ? 'troy-ounce' : 'aggregate-price',
    priceType: kind === 'gold' ? 'monthly-average' : 'observed-aggregate-price',
    frequency: kind === 'gold' ? 'month' : 'day',
    referenceDate,
    latestDate,
    availableDates: kind === 'crypto' ? availableDates : undefined,
    observedAt: data[0]?.observedAt ?? null,
    sourceUrl: sourceConfig.url,
    licenseUrl: sourceConfig.terms,
    attribution: sourceConfig.attribution,
    stale: data.length > 0 && (kind === 'gold'
      ? now - new Date(referenceDate) > 70 * 86400000
      : now - new Date(data[0].observedAt) > 36 * 3600000),
    data: data.map((row) => ({ ...row, aliases: [], timestamp: row.observedAt })),
    history: history.map((row) => ({ ...row, aliases: [], timestamp: row.observedAt })),
  };
}

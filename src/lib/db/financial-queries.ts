import "server-only";
import { getFinancialReadOnlyPool } from "./financial-readonly";
import { SEC_TARGETS } from "../data-platform/providers/sec-targets.mjs";

const sortColumns: Record<string, string> = {
  symbol: "a.symbol", name: "a.name", close: "latest.close", changePercent: '"changePercent"', quoteChangePercent: "quote.quote_change_percent",
  volume: "latest.volume", marketCap: "latest.market_cap",
};

const marketRightsWhere = `s.financial_rights->>'publicDisplay'='confirmed'
  and s.financial_rights->>'userApi'='confirmed'
  and s.reviewed_at is not null and s.terms_version is not null and s.review_due_at > now()`;
const visualizationRightsWhere = `${marketRightsWhere} and s.financial_rights->>'derivedVisualization'='confirmed'`;

export type FinancialListOptions = {
  type: string; market?: string | null; search?: string; sort: string; order: "asc" | "desc"; limit: number; offset: number; referenceDate?: string | null; visualization?: boolean;
};

const rowsSql = (dateParameter: number) => `select a.id, a.asset_type as "assetType", a.symbol, a.name, a.venue, a.country_code as "countryCode",
  a.currency, a.unit, a.timezone, a.sector, s.id as "sourceId", s.name as "sourceName", s.source_url as "sourceUrl",
  s.attribution, latest.reference_date as "referenceDate", latest.reference_timezone as "referenceTimezone",
  latest.price_kind as "priceKind", latest.open::text as open, latest.high::text as high, latest.low::text as low,
  latest.close::text as close, latest.volume::text as volume, latest.market_cap::text as "marketCap",
  latest.is_adjusted as "isAdjusted", latest.fetched_at as "fetchedAt",
  quote.close::text as "currentQuote", quote.quote_change_percent::text as "quoteChangePercent", quote.quote_window as "quoteWindow", quote.fetched_at as "quoteFetchedAt",
  previous.reference_date as "previousReferenceDate", previous.close::text as "previousClose",
  case when previous.close > 0 then round((latest.close - previous.close) / previous.close * 100, 8)::text else null end as "changePercent"
  from financial_assets a
  join data_sources s on s.id=a.source_id and ${marketRightsWhere}
  left join lateral (select p.* from financial_daily_prices p where p.asset_id=a.id and p.source_id=a.source_id and p.price_kind='close' and ($${dateParameter}::text is null or p.reference_date <= $${dateParameter}::text) order by p.reference_date desc limit 1) latest on true
  left join lateral (select p.* from financial_daily_prices p where p.asset_id=a.id and p.source_id=a.source_id and p.price_kind in ('quote-24h','quote-session') and ($${dateParameter}::text is null or p.reference_date <= $${dateParameter}::text) order by p.fetched_at desc limit 1) quote on true
  left join lateral (select p.* from financial_daily_prices p where p.asset_id=a.id and p.source_id=a.source_id and p.price_kind='close' and p.reference_date < latest.reference_date order by p.reference_date desc limit 1) previous on true`;

function assetFilters(options: FinancialListOptions) {
  const values: unknown[] = [options.type];
  const filters = ["a.asset_type=$1", "a.is_active=true"];
  if (options.market === "us" || options.market === "kr") {
    values.push(options.market.toUpperCase());
    filters.push(`a.country_code=$${values.length}`);
  } else if (options.market === "krw" || options.market === "usd" || options.market === "usdt") {
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
  const rightsWhere = options.visualization ? visualizationRightsWhere : marketRightsWhere;
  const pool = getFinancialReadOnlyPool();
  const dateParameter = values.length + 1;
  const listValues = [...values, options.referenceDate ?? null];
  const [count, rows] = await Promise.all([
    pool.query(`select count(*)::int as total from financial_assets a join data_sources s on s.id=a.source_id and ${rightsWhere} where ${where}`, values),
    pool.query(`${rowsSql(dateParameter).replace(marketRightsWhere, rightsWhere)} where ${where} order by ${sortColumns[options.sort] ?? "a.symbol"} ${options.order === "desc" ? "desc" : "asc"} nulls last, a.symbol asc limit $${values.length + 2} offset $${values.length + 3}`, [...listValues, options.limit, options.offset]),
  ]);
  return { rows: rows.rows, total: count.rows[0]?.total ?? 0 };
}

export async function getFinancialOverview() {
  const pool = getFinancialReadOnlyPool();
  const result = await pool.query(`select a.asset_type as "assetType", a.country_code as "countryCode", a.currency,
    count(*)::int as "assetCount", count(latest.reference_date)::int as "pricedAssetCount", max(latest.reference_date) as "latestDate",
    max(latest.fetched_at) as "lastFetchedAt"
    from financial_assets a join data_sources s on s.id=a.source_id and ${marketRightsWhere}
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
    join data_sources s on s.id=p.source_id and ${marketRightsWhere}
    where p.asset_id=$1 and p.price_kind='close' and ($2::text is null or p.reference_date >= $2::text) and ($3::text is null or p.reference_date <= $3::text)
    order by p.reference_date desc limit $4`, [assetId, options.from ?? null, options.to ?? null, options.limit]);
  return result.rows;
}

export async function getFinancialDataStatus() {
  const result = await getFinancialReadOnlyPool().query(`select
    count(distinct a.source_id) filter (where ${marketRightsWhere} and a.is_active=true)::int as "approvedProviderCount",
    count(distinct a.id) filter (where ${marketRightsWhere} and a.is_active=true)::int as "approvedAssetCount",
    count(p.asset_id) filter (where ${marketRightsWhere})::int as "priceObservationCount"
    from data_sources s left join financial_assets a on a.source_id=s.id
    left join financial_daily_prices p on p.source_id=s.id and p.asset_id=a.id`);
  const status = result.rows[0];
  const state = status.approvedProviderCount === 0 ? "no-approved-provider" : status.approvedAssetCount === 0 ? "no-approved-assets" : status.priceObservationCount === 0 ? "no-observations" : "available";
  return { state, ...status };
}

export async function getFinancialProviderRuntimeStatus(providerIds: string[]) {
  if (!providerIds.length) return [];
  const result = await getFinancialReadOnlyPool().query(`select s.id as "providerId",s.financial_rights as rights,s.collection_enabled as "collectionEnabled",
    s.reviewed_at as "reviewedAt",s.terms_version as "termsVersion",s.review_due_at as "reviewDueAt",
    d.id as "datasetId",latest.status as "lastRunStatus",latest.finished_at as "lastRunAt",latest.latest_reference_period as "latestReferenceDate",
    latest.record_count as "lastRunRecords",coalesce(count(p.asset_id) filter (where s.financial_rights->>'publicDisplay'='confirmed' and s.financial_rights->>'userApi'='confirmed'),0)::int as "publicPriceCount"
    from data_sources s left join datasets d on d.source_id=s.id
    left join lateral (select r.status,r.finished_at,r.latest_reference_period,r.record_count from data_collection_runs r where r.dataset_id=d.id order by r.started_at desc limit 1) latest on true
    left join financial_assets a on a.source_id=s.id left join financial_daily_prices p on p.source_id=s.id and p.asset_id=a.id
    where s.id=any($1::text[]) group by s.id,d.id,latest.status,latest.finished_at,latest.latest_reference_period,latest.record_count`, [providerIds]);
  return result.rows;
}

export type CompanyFactsPeriod = "annual" | "quarterly";
export type CompanyFactsFilters = { ticker?: string | null; period?: CompanyFactsPeriod | null; latest?: boolean };

const companyFactsEligibleCte = `with grouped as (
    select c.id as "companyId",c.ticker,c.name,c.exchange,c.sector,c.sic_code as "sicCode",c.industry,
      f.fiscal_year as "fiscalYear",f.fiscal_period as "fiscalPeriod",
      min(f.start_date)::text as "startDate",f.end_date::text as "endDate",f.filed_date::text as "filedDate",f.form,f.accession_number as "accessionNumber",
      case when f.start_date is null then null else (f.end_date::date-f.start_date::date+1)::int end as "durationDays",
      (array_agg(f.value::text order by case f.concept when 'RevenueFromContractWithCustomerExcludingAssessedTax' then 1 when 'Revenues' then 2 else 3 end,f.concept) filter (where f.concept in ('RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet') and f.unit='USD'))[1] as revenue,
      max(f.value) filter (where f.concept='OperatingIncomeLoss' and f.unit='USD')::text as "operatingIncome",
      max(f.value) filter (where f.concept='NetIncomeLoss' and f.unit='USD')::text as "netIncome",
      (select max(balance.value)::text from financial_company_facts balance where balance.company_id=c.id and balance.dataset_id=f.dataset_id and balance.end_date=f.end_date and balance.filed_date=f.filed_date and balance.form=f.form and balance.accession_number=f.accession_number and balance.concept='Assets' and balance.unit='USD' and balance.start_date is null) as assets,
      (select max(balance.value)::text from financial_company_facts balance where balance.company_id=c.id and balance.dataset_id=f.dataset_id and balance.end_date=f.end_date and balance.filed_date=f.filed_date and balance.form=f.form and balance.accession_number=f.accession_number and balance.concept='Liabilities' and balance.unit='USD' and balance.start_date is null) as liabilities,
      max(f.value) filter (where f.concept='NetCashProvidedByUsedInOperatingActivities' and f.unit='USD')::text as "operatingCashFlow",
      min(f.source_url) as "sourceUrl",s.name as "sourceName",s.attribution
    from financial_company_facts f join financial_companies c on c.id=f.company_id
    join data_sources s on s.id=f.source_id and s.license_status='verified'
    where f.dataset_id='sec-company-facts' and ($1::text is null or c.ticker=$1) and c.ticker=any($4::text[])
    group by c.id,c.ticker,c.name,c.exchange,c.sector,c.sic_code,c.industry,f.dataset_id,f.fiscal_year,f.fiscal_period,f.start_date,f.end_date,f.filed_date,f.form,f.accession_number,s.name,s.attribution
  ), eligible as (
    select * from grouped where $2::text is null or
      ($2='annual' and form in ('10-K','10-K/A') and "fiscalPeriod"='FY' and "durationDays" between 300 and 400) or
      ($2='quarterly' and form in ('10-Q','10-Q/A') and "fiscalPeriod" in ('Q1','Q2','Q3') and "durationDays" between 65 and 110)
  )`;

const companyFactsRowsCte = `${companyFactsEligibleCte}, scored as (
    select *, ((revenue is not null)::int+("operatingIncome" is not null)::int+("netIncome" is not null)::int+("operatingCashFlow" is not null)::int) as completeness,
      row_number() over (partition by "companyId","endDate","fiscalYear","fiscalPeriod" order by "filedDate" desc,case when form in ('10-K/A','10-Q/A') then 1 else 0 end desc,((revenue is not null)::int+("operatingIncome" is not null)::int+("netIncome" is not null)::int+("operatingCashFlow" is not null)::int) desc,abs(coalesce("durationDays",0)-case when $2='annual' then 365 when $2='quarterly' then 90 else 0 end),"startDate" desc nulls last) as filing_row
    from eligible
  ), period_rows as (
    select * from scored where filing_row=1
  ), ranked as (
    select *,row_number() over (partition by "companyId" order by "endDate" desc,"filedDate" desc,"fiscalYear" desc nulls last,"fiscalPeriod" desc nulls last) as latest_row
    from period_rows
  )`;

export async function listFinancialCompanyFacts(limit = 100, offset = 0, filters: CompanyFactsFilters = {}) {
  const ticker = filters.ticker ?? null;
  const period = filters.period ?? null;
  const latest = filters.latest ?? false;
  const result = await getFinancialReadOnlyPool().query(`${companyFactsRowsCte}
    select "companyId",ticker,name,exchange,sector,"sicCode",industry,"fiscalYear","fiscalPeriod","startDate","endDate","filedDate",form,"accessionNumber","durationDays",revenue,"operatingIncome","netIncome",assets,liabilities,"operatingCashFlow","sourceUrl","sourceName",attribution
    from ranked where (not $3::boolean or latest_row=1)
    order by "endDate" desc,"filedDate" desc,ticker limit $5 offset $6`, [ticker, period, latest, SEC_TARGETS.map(({ ticker: targetTicker }) => targetTicker), Math.max(1, Math.min(200, Math.trunc(limit))), Math.max(0, Math.trunc(offset))]);
  return result.rows;
}

export async function countFinancialCompanyFacts(filters: CompanyFactsFilters = {}) {
  const query = filters.latest
    ? `select count(distinct c.id)::int as total
      from financial_companies c join financial_company_facts f on f.company_id=c.id and f.dataset_id='sec-company-facts'
      join data_sources s on s.id=f.source_id and s.license_status='verified'
      where ($1::text is null or c.ticker=$1) and c.ticker=any($3::text[])
        and ($2::text is null or
          ($2='annual' and f.form in ('10-K','10-K/A') and f.fiscal_period='FY' and f.start_date is not null and (f.end_date::date-f.start_date::date+1) between 300 and 400) or
          ($2='quarterly' and f.form in ('10-Q','10-Q/A') and f.fiscal_period in ('Q1','Q2','Q3') and f.start_date is not null and (f.end_date::date-f.start_date::date+1) between 65 and 110))`
    : `${companyFactsRowsCte} select count(*)::int as total from ranked`;
  const values = filters.latest
    ? [filters.ticker ?? null, filters.period ?? null, SEC_TARGETS.map(({ ticker }) => ticker)]
    : [filters.ticker ?? null, filters.period ?? null, filters.latest ?? false, SEC_TARGETS.map(({ ticker }) => ticker)];
  const result = await getFinancialReadOnlyPool().query(query, values);
  return result.rows[0]?.total ?? 0;
}

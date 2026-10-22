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

export async function getFinancialDataStatus() {
  const result = await getFinancialReadOnlyPool().query(`select
    count(distinct a.source_id) filter (where s.license_status='verified' and a.is_active=true)::int as "approvedProviderCount",
    count(distinct a.id) filter (where s.license_status='verified' and a.is_active=true)::int as "approvedAssetCount",
    count(p.asset_id) filter (where s.license_status='verified')::int as "priceObservationCount"
    from data_sources s left join financial_assets a on a.source_id=s.id
    left join financial_daily_prices p on p.source_id=s.id and p.asset_id=a.id`);
  const status = result.rows[0];
  const state = status.approvedProviderCount === 0 ? "no-approved-provider" : status.approvedAssetCount === 0 ? "no-approved-assets" : status.priceObservationCount === 0 ? "no-observations" : "available";
  return { state, ...status };
}

export type CompanyFactsPeriod = "annual" | "quarterly";
export type CompanyFactsFilters = { ticker?: string | null; period?: CompanyFactsPeriod | null; latest?: boolean };

const companyFactsRowsCte = `with grouped as (
    select c.id as "companyId",c.ticker,c.name,c.exchange,f.fiscal_year as "fiscalYear",f.fiscal_period as "fiscalPeriod",
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
    where f.dataset_id='sec-company-facts' and ($1::text is null or c.ticker=$1)
    group by c.id,c.ticker,c.name,c.exchange,f.dataset_id,f.fiscal_year,f.fiscal_period,f.start_date,f.end_date,f.filed_date,f.form,f.accession_number,s.name,s.attribution
  ), eligible as (
    select * from grouped where $2::text is null or
      ($2='annual' and form='10-K' and "fiscalPeriod"='FY' and "durationDays" between 300 and 400) or
      ($2='quarterly' and form='10-Q' and "fiscalPeriod" in ('Q1','Q2','Q3') and "durationDays" between 65 and 110)
  ), scored as (
    select *, ((revenue is not null)::int+("operatingIncome" is not null)::int+("netIncome" is not null)::int+("operatingCashFlow" is not null)::int) as completeness,
      row_number() over (partition by "companyId","endDate","filedDate",form,"accessionNumber","fiscalYear","fiscalPeriod" order by ((revenue is not null)::int+("operatingIncome" is not null)::int+("netIncome" is not null)::int+("operatingCashFlow" is not null)::int) desc,abs(coalesce("durationDays",0)-case when $2='annual' then 365 when $2='quarterly' then 90 else 0 end),"startDate" desc nulls last) as filing_row
    from eligible
  ), period_rows as (
    select * from scored where $2::text is null or filing_row=1
  ), ranked as (
    select *,row_number() over (partition by "companyId" order by "endDate" desc,"filedDate" desc,"fiscalYear" desc nulls last,"fiscalPeriod" desc nulls last) as latest_row
    from period_rows
  )`;

export async function listFinancialCompanyFacts(limit = 100, offset = 0, filters: CompanyFactsFilters = {}) {
  const ticker = filters.ticker ?? null;
  const period = filters.period ?? null;
  const latest = filters.latest ?? false;
  const result = await getFinancialReadOnlyPool().query(`${companyFactsRowsCte}
    select "companyId",ticker,name,exchange,"fiscalYear","fiscalPeriod","startDate","endDate","filedDate",form,"accessionNumber","durationDays",revenue,"operatingIncome","netIncome",assets,liabilities,"operatingCashFlow","sourceUrl","sourceName",attribution
    from ranked where (not $3::boolean or latest_row=1)
    order by "endDate" desc,"filedDate" desc,ticker limit $4 offset $5`, [ticker, period, latest, Math.max(1, Math.min(200, Math.trunc(limit))), Math.max(0, Math.trunc(offset))]);
  return result.rows;
}

export async function countFinancialCompanyFacts(filters: CompanyFactsFilters = {}) {
  const result = await getFinancialReadOnlyPool().query(`${companyFactsRowsCte}
    select count(*)::int as total from ranked where (not $3::boolean or latest_row=1)`, [filters.ticker ?? null, filters.period ?? null, filters.latest ?? false]);
  return result.rows[0]?.total ?? 0;
}

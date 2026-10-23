export const SEC_IMPORT_BATCH_SIZE = 500;

export async function loadExistingSecCompanyState(client, sourceId) {
  const { rows } = await client.query(`select c.ticker,c.cik,c.sector,c.last_submission_accession,
      (select f.accession_number from financial_company_facts f where f.company_id=c.id
        and f.form in ('10-K','10-Q','10-K/A','10-Q/A') order by f.filed_date desc,f.accession_number desc limit 1) as latest_fact_accession
    from financial_companies c where c.source_id=$1`, [sourceId]);
  return new Map(rows.map((row) => [row.ticker, {
    cik: row.cik,
    accessionNumber: row.last_submission_accession ?? row.latest_fact_accession ?? null,
  }]));
}

export async function collectChangedSecCompanies(provider, companies, existing = new Map()) {
  const updated = [];
  const unchanged = [];
  const failed = (companies.unresolvedTargets ?? []).map((company) => ({
    ticker: company.ticker,
    cik: null,
    error: "Ticker is no longer present in the official SEC issuer directory.",
    code: "sec-target-unresolved",
  }));
  for (const company of companies) {
    try {
      const profile = await provider.fetchSubmissions(company);
      const latestAccession = profile.latestFiling?.accessionNumber ?? null;
      const previous = existing.get(company.ticker);
      const sameCik = previous?.cik === company.cik;
      const filingUnchanged = latestAccession && previous?.accessionNumber === latestAccession;
      if (sameCik && filingUnchanged) {
        unchanged.push({ company: { ...company, name: profile.name, sicCode: profile.sicCode, industry: profile.industry }, profile });
        continue;
      }
      const snapshot = await provider.fetchCompany(company, { profile });
      updated.push({ ...snapshot, profile });
    } catch (error) {
      failed.push({ ticker: company.ticker, cik: company.cik, error: error instanceof Error ? error.message : "SEC collection failed.", code: typeof error?.code === "string" ? error.code : "sec-company-failed" });
    }
  }
  return { updated, unchanged, failed };
}

async function ensureLegacyIssuer(client, company, sourceId) {
  if (!company.rekeyFromCik) return null;
  const cik = company.rekeyFromCik;
  const ticker = `CIK${Number(cik)}`;
  const { rows: [legacy] } = await client.query("select id,ticker from financial_companies where source_id=$1 and cik=$2", [sourceId, cik]);
  if (legacy) {
    if (legacy.ticker !== ticker) {
      const { rows: [collision] } = await client.query("select id from financial_companies where source_id=$1 and ticker=$2 and id<>$3", [sourceId, ticker, legacy.id]);
      if (collision) throw new Error(`Cannot preserve legacy SEC issuer ${cik}: archive ticker ${ticker} is already in use.`);
      await client.query("update financial_companies set ticker=$2,updated_at=now() where id=$1 and source_id=$3", [legacy.id, ticker, sourceId]);
    }
    return { id: legacy.id, ticker };
  }
  const sourceUrl = `https://www.sec.gov/edgar/browse/?CIK=${Number(cik)}&owner=exclude`;
  const { rows: [saved] } = await client.query(`insert into financial_companies
      (source_id,provider_company_id,cik,ticker,name,exchange,country_code,source_url,updated_at)
    values ($1,$2,$2,$3,$4,null,'US',$5,now()) returning id`,
  [sourceId, cik, ticker, company.rekeyFromName ?? `SEC issuer CIK ${Number(cik)}`, sourceUrl]);
  return { id: saved.id, ticker };
}

export async function persistSecCompanyFacts(client, { updated, unchanged }, { sourceId, datasetId }) {
  const companyIds = new Map();
  let reclassifiedFacts = 0;
  for (const item of [...unchanged, ...updated]) {
    const company = item.company;
    const legacy = await ensureLegacyIssuer(client, company, sourceId);
    const { rows: [saved] } = await client.query(`insert into financial_companies
        (source_id,provider_company_id,cik,ticker,name,exchange,sector,sic_code,industry,last_submission_accession,last_submission_filed_date,last_submission_form,country_code,source_url,updated_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'US',$13,now())
      on conflict (source_id,cik) do update set provider_company_id=excluded.provider_company_id,ticker=excluded.ticker,
        name=excluded.name,exchange=excluded.exchange,sector=excluded.sector,sic_code=excluded.sic_code,industry=excluded.industry,
        last_submission_accession=coalesce(excluded.last_submission_accession,financial_companies.last_submission_accession),
        last_submission_filed_date=coalesce(excluded.last_submission_filed_date,financial_companies.last_submission_filed_date),
        last_submission_form=coalesce(excluded.last_submission_form,financial_companies.last_submission_form),
        country_code=excluded.country_code,source_url=excluded.source_url,updated_at=now()
      returning id`, [sourceId, company.cik, company.cik, company.ticker, company.name, company.exchange, company.sector ?? "other", company.sicCode, company.industry,
      item.profile.latestFiling?.accessionNumber ?? null, item.profile.latestFiling?.filedDate ?? null, item.profile.latestFiling?.form ?? null, company.sourceUrl]);
    companyIds.set(company.ticker, saved.id);
    if (legacy) {
      const sourceCikPath = `/data/${Number(company.rekeyFromCik)}/`;
      const moved = await client.query(`update financial_company_facts set company_id=$2
        where company_id=$1 and source_id=$3 and position($4 in source_url)>0`, [saved.id, legacy.id, sourceId, sourceCikPath]);
      reclassifiedFacts += moved.rowCount ?? 0;
    }
  }

  let insertedFacts = 0;
  let updatedFacts = 0;
  const facts = updated.flatMap((item) => item.facts.map((fact) => ({
    company_id: companyIds.get(item.company.ticker),
    taxonomy: fact.taxonomy,
    concept: fact.concept,
    unit: fact.unit,
    value: fact.value,
    period_key: fact.periodKey,
    fiscal_year: fact.fiscalYear,
    fiscal_period: fact.fiscalPeriod,
    start_date: fact.startDate,
    end_date: fact.endDate,
    filed_date: fact.filedDate,
    form: fact.form,
    accession_number: fact.accessionNumber,
    source_url: fact.sourceUrl,
    fetched_at: fact.fetchedAt,
  })));
  for (let offset = 0; offset < facts.length; offset += SEC_IMPORT_BATCH_SIZE) {
    const batch = facts.slice(offset, offset + SEC_IMPORT_BATCH_SIZE);
    const { rows } = await client.query(`with input as (
        select * from jsonb_to_recordset($1::jsonb) as x(
          company_id uuid,taxonomy text,concept text,unit text,value numeric,period_key text,fiscal_year integer,
          fiscal_period text,start_date text,end_date text,filed_date text,form text,accession_number text,source_url text,fetched_at timestamptz
        )
      ) insert into financial_company_facts
        (company_id,source_id,dataset_id,taxonomy,concept,unit,value,period_key,fiscal_year,fiscal_period,start_date,end_date,filed_date,form,accession_number,source_url,fetched_at)
      select company_id,$2,$3,taxonomy,concept,unit,value,period_key,fiscal_year,fiscal_period,start_date,end_date,filed_date,form,accession_number,source_url,fetched_at from input
      on conflict (company_id,taxonomy,concept,unit,end_date,accession_number,period_key) do update set
        source_id=excluded.source_id,dataset_id=excluded.dataset_id,value=excluded.value,fiscal_year=excluded.fiscal_year,
        fiscal_period=excluded.fiscal_period,start_date=excluded.start_date,filed_date=excluded.filed_date,form=excluded.form,
        source_url=excluded.source_url,fetched_at=excluded.fetched_at
      returning (xmax=0) as inserted`, [JSON.stringify(batch), sourceId, datasetId]);
    insertedFacts += rows.filter((row) => row.inserted).length;
    updatedFacts += rows.length - rows.filter((row) => row.inserted).length;
  }
  return { companies: companyIds.size, facts: facts.length, insertedFacts, updatedFacts, reclassifiedFacts };
}

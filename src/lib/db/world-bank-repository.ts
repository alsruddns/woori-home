import "server-only";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { getDatabase } from "./index";
import { countries, dataSources, datasets, indicators, observations } from "./schema";

const approvedIndicatorCodes = ["SL.UEM.TOTL.ZS", "EG.ELC.ACCS.ZS"] as const;
export type ApprovedWorldBankIndicator = (typeof approvedIndicatorCodes)[number];

function isApprovedIndicator(code: string): code is ApprovedWorldBankIndicator {
  return approvedIndicatorCodes.includes(code as ApprovedWorldBankIndicator);
}

export async function listWorldBankCountries() {
  return getDatabase().select({
    iso3: countries.iso3,
    iso2: countries.iso2,
    worldBankCode: countries.worldBankCode,
    localizedNames: countries.localizedNames,
    region: countries.region,
    incomeGroup: countries.incomeGroup,
    isAggregate: countries.isAggregate,
  }).from(countries).where(inArray(countries.iso3, ["AUS", "BRA", "CAN", "CHN", "DEU", "FRA", "GBR", "IDN", "IND", "JPN", "KOR", "MEX", "NGA", "USA", "ZAF", "WLD"]))
    .orderBy(asc(countries.iso3));
}

export async function listWorldBankIndicators() {
  return getDatabase().select({
    code: indicators.code,
    localizedNames: indicators.localizedNames,
    definition: indicators.definition,
    unit: indicators.unit,
    frequency: indicators.frequency,
    sourceName: dataSources.name,
    attribution: dataSources.attribution,
    licenseStatus: dataSources.licenseStatus,
  }).from(indicators)
    .innerJoin(datasets, eq(indicators.datasetId, datasets.id))
    .innerJoin(dataSources, eq(datasets.sourceId, dataSources.id))
    .where(and(eq(datasets.id, "world-development-indicators"), inArray(indicators.code, [...approvedIndicatorCodes])))
    .orderBy(asc(indicators.code));
}

export async function getReviewedWorldBankSourceInfo(indicatorCode: string) {
  if (!isApprovedIndicator(indicatorCode)) throw new Error("Indicator is outside the reviewed World Bank DB scope");
  const [row] = await getDatabase().select({ definition: indicators.definition })
    .from(indicators)
    .innerJoin(datasets, eq(indicators.datasetId, datasets.id))
    .where(and(eq(datasets.id, "world-development-indicators"), eq(indicators.code, indicatorCode)))
    .limit(1);
  if (!row) return null;
  const metadata = row.definition as Record<string, unknown>;
  return {
    provider: typeof metadata.provider === "string" ? metadata.provider : "World Bank World Development Indicators",
    providerUrl: typeof metadata.providerUrl === "string" ? metadata.providerUrl : "https://data.worldbank.org/summary-terms-of-use",
    license: typeof metadata.license === "string" ? metadata.license : "CC BY 4.0",
    licenseUrl: typeof metadata.licenseUrl === "string" ? metadata.licenseUrl : "https://creativecommons.org/licenses/by/4.0/",
  };
}

export async function getCountryIndicatorSeries(countryIso3: string, indicatorCode: string, yearFrom = 1800, yearTo = 2200) {
  if (!isApprovedIndicator(indicatorCode)) throw new Error("Indicator is outside the reviewed World Bank DB scope");
  return getDatabase().select({
    countryIso3: observations.countryIso3,
    indicatorCode: observations.indicatorId,
    year: observations.referenceYear,
    value: observations.value,
    unit: indicators.unit,
    lastCheckedAt: observations.lastCheckedAt,
    lastUpdatedAt: observations.lastUpdatedAt,
    source: dataSources.name,
    attribution: dataSources.attribution,
    definition: indicators.definition,
  }).from(observations)
    .innerJoin(indicators, eq(observations.indicatorId, indicators.id))
    .innerJoin(datasets, eq(indicators.datasetId, datasets.id))
    .innerJoin(dataSources, eq(datasets.sourceId, dataSources.id))
    .where(and(eq(datasets.id, "world-development-indicators"), eq(observations.countryIso3, countryIso3), eq(indicators.code, indicatorCode), gte(observations.referenceYear, yearFrom), lte(observations.referenceYear, yearTo)))
    .orderBy(asc(observations.referenceYear))
    .limit(401);
}

export async function getLatestCountryIndicator(countryIso3: string, indicatorCode: string) {
  if (!isApprovedIndicator(indicatorCode)) throw new Error("Indicator is outside the reviewed World Bank DB scope");
  const [row] = await getDatabase().select({
    countryIso3: observations.countryIso3,
    indicatorCode: observations.indicatorId,
    year: observations.referenceYear,
    value: observations.value,
    unit: indicators.unit,
    lastCheckedAt: observations.lastCheckedAt,
    lastUpdatedAt: observations.lastUpdatedAt,
    source: dataSources.name,
    attribution: dataSources.attribution,
  }).from(observations)
    .innerJoin(indicators, eq(observations.indicatorId, indicators.id))
    .innerJoin(datasets, eq(indicators.datasetId, datasets.id))
    .innerJoin(dataSources, eq(datasets.sourceId, dataSources.id))
    .where(and(eq(datasets.id, "world-development-indicators"), eq(observations.countryIso3, countryIso3), eq(indicators.code, indicatorCode)))
    .orderBy(desc(observations.referenceYear))
    .limit(1);
  return row ?? null;
}

export async function compareWorldBankCountries(indicatorCode: string, countryIso3: string[], yearFrom = 1800, yearTo = 2200) {
  if (!isApprovedIndicator(indicatorCode)) throw new Error("Indicator is outside the reviewed World Bank DB scope");
  if (countryIso3.length < 2 || countryIso3.length > 20) throw new Error("Country comparison requires 2 to 20 ISO3 codes");
  return getDatabase().select({
    countryIso3: observations.countryIso3,
    year: observations.referenceYear,
    value: observations.value,
    unit: indicators.unit,
    lastCheckedAt: observations.lastCheckedAt,
    lastUpdatedAt: observations.lastUpdatedAt,
    source: dataSources.name,
    attribution: dataSources.attribution,
  }).from(observations)
    .innerJoin(indicators, eq(observations.indicatorId, indicators.id))
    .innerJoin(datasets, eq(indicators.datasetId, datasets.id))
    .innerJoin(dataSources, eq(datasets.sourceId, dataSources.id))
    .where(and(eq(datasets.id, "world-development-indicators"), eq(indicators.code, indicatorCode), inArray(observations.countryIso3, countryIso3), gte(observations.referenceYear, yearFrom), lte(observations.referenceYear, yearTo)))
    .orderBy(asc(observations.countryIso3), asc(observations.referenceYear))
    .limit(countryIso3.length * 401);
}

export async function listLatestWorldBankObservations(indicatorCode: string, limit = 100) {
  if (!isApprovedIndicator(indicatorCode)) throw new Error("Indicator is outside the reviewed World Bank DB scope");
  const safeLimit = Math.max(1, Math.min(300, Math.floor(limit)));
  return getDatabase().selectDistinctOn([observations.countryIso3], {
    countryIso3: observations.countryIso3,
    referenceYear: observations.referenceYear,
    value: observations.value,
    unit: indicators.unit,
    source: dataSources.name,
    attribution: dataSources.attribution,
  }).from(observations)
    .innerJoin(indicators, eq(observations.indicatorId, indicators.id))
    .innerJoin(datasets, eq(indicators.datasetId, datasets.id))
    .innerJoin(dataSources, eq(datasets.sourceId, dataSources.id))
    .where(and(eq(datasets.id, "world-development-indicators"), eq(indicators.code, indicatorCode)))
    .orderBy(asc(observations.countryIso3), desc(observations.referenceYear))
    .limit(safeLimit);
}

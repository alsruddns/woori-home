export type DataObservation = {
  country: string;
  countryName: string;
  indicator: string;
  year: number;
  value: number;
  unit: string;
  source: "World Bank";
  dataProvider: string;
  sourceUrl: string;
  license: string;
  publishedAt: string | null;
  lastCheckedAt: string;
  lastUpdatedAt: string;
};

export type DataSnapshot = {
  schemaVersion: 2;
  source: "World Bank";
  generatedAt: string;
  countryMetadata?: { iso3: string; iso2: string | null; worldBankCode: string; name: string; region: string | null; incomeGroup: string | null; isAggregate: boolean }[];
  indicatorMetadata: Record<string, Omit<DataObservation, "country" | "countryName" | "indicator" | "year" | "value">>;
  observations: Pick<DataObservation, "country" | "countryName" | "indicator" | "year" | "value">[];
};

export type IndicatorDefinition = {
  id: string;
  category: "world" | "economy" | "population" | "energy";
  code: string;
  unit: string;
  label: Record<string, string>;
  definition: Record<string, string>;
  interpretation: Record<string, string>;
};

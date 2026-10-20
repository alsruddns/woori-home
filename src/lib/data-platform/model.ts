export type DataObservation = {
  country: string;
  countryName: string;
  indicator: string;
  year: number;
  value: number;
  unit: string;
  source: "World Bank";
  sourceUrl: string;
  license: string;
  publishedAt: string | null;
  lastCheckedAt: string;
  lastUpdatedAt: string;
};

export type DataSnapshot = {
  schemaVersion: 1;
  source: "World Bank";
  generatedAt: string;
  observations: DataObservation[];
};

export type IndicatorDefinition = {
  id: string;
  category: "world" | "economy" | "population";
  code: string;
  unit: string;
  label: Record<string, string>;
  definition: Record<string, string>;
  interpretation: Record<string, string>;
};

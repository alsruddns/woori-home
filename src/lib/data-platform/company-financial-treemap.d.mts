type FinancialFactValues = { revenue?: string | number | null; operatingIncome?: string | number | null; netIncome?: string | number | null; assets?: string | number | null };
export function sicDivision(sicCode: string | null | undefined): { key: string; label: string };
export function sicIndustryGroup(sicCode: string | null | undefined): "technology" | "semiconductors" | "healthcare" | "finance" | "energy" | "consumer" | "telecom-media" | "industrial" | "other" | "unclassified";
export function companyFinancialMetrics(row: FinancialFactValues | null | undefined, prior?: FinancialFactValues | null): {
  revenue: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  assets: number | null;
  revenueGrowth: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
};

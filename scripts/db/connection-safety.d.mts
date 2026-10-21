export function resolveDatabaseTarget(options?: {
  target?: string;
  databaseUrl?: string;
  allowProductionMigration?: string;
  requireProductionApproval?: boolean;
}): { target: "development" | "production"; database: string; url: string };
export function assertNoDestructiveMigration(sql: string, filename: string): void;

ALTER TABLE "financial_companies" ADD COLUMN "sector" varchar(32) DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_companies" ADD COLUMN "sic_code" varchar(4);--> statement-breakpoint
ALTER TABLE "financial_companies" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "financial_companies" ADD COLUMN "last_submission_accession" varchar(24);--> statement-breakpoint
ALTER TABLE "financial_companies" ADD COLUMN "last_submission_filed_date" char(10);--> statement-breakpoint
ALTER TABLE "financial_companies" ADD COLUMN "last_submission_form" varchar(12);--> statement-breakpoint
CREATE INDEX "financial_companies_source_sector_ticker_idx" ON "financial_companies" USING btree ("source_id","sector","ticker");--> statement-breakpoint
ALTER TABLE "financial_companies" ADD CONSTRAINT "financial_companies_sector_check" CHECK ("financial_companies"."sector" in ('information-technology','semiconductors','financials','healthcare','consumer','energy','industrials','communications','utilities','real-estate','other'));--> statement-breakpoint
ALTER TABLE "financial_companies" ADD CONSTRAINT "financial_companies_sic_check" CHECK ("financial_companies"."sic_code" is null or "financial_companies"."sic_code" ~ '^\d{4}$');--> statement-breakpoint
ALTER TABLE "financial_companies" ADD CONSTRAINT "financial_companies_submission_filed_date_check" CHECK ("financial_companies"."last_submission_filed_date" is null or "financial_companies"."last_submission_filed_date" ~ '^\d{4}-\d{2}-\d{2}$');--> statement-breakpoint
ALTER TABLE "financial_companies" ADD CONSTRAINT "financial_companies_submission_form_check" CHECK ("financial_companies"."last_submission_form" is null or "financial_companies"."last_submission_form" in ('10-K','10-Q','10-K/A','10-Q/A'));
--> statement-breakpoint
UPDATE "financial_companies" SET "sector" = CASE "ticker"
  WHEN 'AAPL' THEN 'information-technology' WHEN 'MSFT' THEN 'information-technology' WHEN 'NVDA' THEN 'semiconductors'
  WHEN 'GOOGL' THEN 'communications' WHEN 'AMZN' THEN 'consumer' WHEN 'META' THEN 'communications' WHEN 'TSLA' THEN 'consumer'
  ELSE 'other' END
WHERE "source_id" = 'sec-edgar-companyfacts';
--> statement-breakpoint
UPDATE "financial_companies" AS company SET
  "last_submission_accession" = filing."accession_number",
  "last_submission_filed_date" = filing."filed_date",
  "last_submission_form" = filing."form"
FROM (
  SELECT DISTINCT ON ("company_id") "company_id", "accession_number", "filed_date", "form"
  FROM "financial_company_facts"
  WHERE "source_id" = 'sec-edgar-companyfacts' AND "form" IN ('10-K','10-Q','10-K/A','10-Q/A')
  ORDER BY "company_id", "filed_date" DESC, "accession_number" DESC
) AS filing
WHERE company."id" = filing."company_id" AND company."source_id" = 'sec-edgar-companyfacts';

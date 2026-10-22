ALTER TABLE "financial_company_facts" ADD COLUMN "period_key" varchar(10) DEFAULT 'instant' NOT NULL;--> statement-breakpoint
UPDATE "financial_company_facts" SET "period_key"=coalesce("start_date",'instant');--> statement-breakpoint
ALTER TABLE "financial_company_facts" ALTER COLUMN "period_key" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "financial_company_facts" DROP CONSTRAINT "financial_company_facts_pk";
--> statement-breakpoint
ALTER TABLE "financial_company_facts" ADD CONSTRAINT "financial_company_facts_pk" PRIMARY KEY("company_id","taxonomy","concept","unit","end_date","accession_number","period_key");

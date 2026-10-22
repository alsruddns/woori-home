CREATE TABLE "financial_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" varchar(80) NOT NULL,
	"provider_company_id" varchar(24) NOT NULL,
	"cik" varchar(10) NOT NULL,
	"ticker" varchar(12) NOT NULL,
	"name" text NOT NULL,
	"exchange" varchar(24),
	"country_code" char(2) DEFAULT 'US' NOT NULL,
	"source_url" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_company_facts" (
	"company_id" uuid NOT NULL,
	"source_id" varchar(80) NOT NULL,
	"dataset_id" varchar(120) NOT NULL,
	"taxonomy" varchar(40) NOT NULL,
	"concept" varchar(180) NOT NULL,
	"unit" varchar(40) NOT NULL,
	"value" numeric(38, 8) NOT NULL,
	"fiscal_year" integer,
	"fiscal_period" varchar(8),
	"start_date" varchar(10),
	"end_date" varchar(10) NOT NULL,
	"filed_date" varchar(10) NOT NULL,
	"form" varchar(12) NOT NULL,
	"accession_number" varchar(24) NOT NULL,
	"source_url" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "financial_company_facts_pk" PRIMARY KEY("company_id","taxonomy","concept","unit","end_date","accession_number"),
	CONSTRAINT "financial_company_facts_dates_check" CHECK ("financial_company_facts"."end_date" ~ '^\d{4}-\d{2}-\d{2}$' and "financial_company_facts"."filed_date" ~ '^\d{4}-\d{2}-\d{2}$')
);
--> statement-breakpoint
ALTER TABLE "financial_companies" ADD CONSTRAINT "financial_companies_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_company_facts" ADD CONSTRAINT "financial_company_facts_company_id_financial_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."financial_companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_company_facts" ADD CONSTRAINT "financial_company_facts_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_company_facts" ADD CONSTRAINT "financial_company_facts_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "financial_companies_source_cik_unique_idx" ON "financial_companies" USING btree ("source_id","cik");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_companies_source_ticker_unique_idx" ON "financial_companies" USING btree ("source_id","ticker");--> statement-breakpoint
CREATE INDEX "financial_companies_ticker_idx" ON "financial_companies" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "financial_company_facts_end_date_idx" ON "financial_company_facts" USING btree ("end_date","company_id");--> statement-breakpoint
CREATE INDEX "financial_company_facts_period_idx" ON "financial_company_facts" USING btree ("fiscal_year","fiscal_period");
--> statement-breakpoint
INSERT INTO "data_sources" ("id","name","provider","source_url","license_status","license_name","license_url","attribution","rights_note","reviewed_at")
VALUES ('sec-edgar-companyfacts','SEC EDGAR Company Facts','U.S. Securities and Exchange Commission','https://data.sec.gov/api/xbrl/companyfacts/','verified','SEC EDGAR public filing content reuse','https://www.sec.gov/about/webmaster-frequently-asked-questions','Source: U.S. Securities and Exchange Commission (SEC) EDGAR; values are issuer-reported and are not verified or endorsed by SEC.','Only SEC-extracted standard US-GAAP company facts from public filings are stored. Third-party exhibits, images, market prices and non-SEC content are excluded.',now())
ON CONFLICT ("id") DO UPDATE SET "license_status"='verified',"rights_note"=excluded."rights_note","reviewed_at"=now(),"updated_at"=now();
--> statement-breakpoint
INSERT INTO "datasets" ("id","source_id","name","category","reference_period_kind","source_url")
VALUES ('sec-company-facts','sec-edgar-companyfacts','SEC Company Financial Facts','financial-fundamentals','fiscal-period','https://www.sec.gov/edgar/sec-api-documentation')
ON CONFLICT ("id") DO UPDATE SET "source_id"=excluded."source_id","name"=excluded."name","category"=excluded."category","reference_period_kind"=excluded."reference_period_kind","source_url"=excluded."source_url","updated_at"=now();

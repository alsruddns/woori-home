CREATE TABLE "countries" (
	"iso3" char(3) PRIMARY KEY NOT NULL,
	"iso2" char(2),
	"localized_names" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_aggregate" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_collection_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dataset_id" varchar(120) NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"status" varchar(16) NOT NULL,
	"latest_reference_period" varchar(32),
	"snapshot_version" varchar(80),
	"checksum" varchar(128),
	"record_count" integer,
	"error_category" varchar(80),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_collection_runs_status_check" CHECK ("data_collection_runs"."status" in ('success', 'unchanged', 'failed', 'partial', 'disabled')),
	CONSTRAINT "data_collection_runs_record_count_check" CHECK ("data_collection_runs"."record_count" is null or "data_collection_runs"."record_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"source_url" text NOT NULL,
	"license_status" varchar(24) DEFAULT 'unknown' NOT NULL,
	"license_name" text,
	"license_url" text,
	"attribution" text,
	"rights_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_sources_license_status_check" CHECK ("data_sources"."license_status" in ('verified', 'conditional', 'restricted', 'unknown'))
);
--> statement-breakpoint
CREATE TABLE "datasets" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"source_id" varchar(80) NOT NULL,
	"name" text NOT NULL,
	"category" varchar(40) NOT NULL,
	"reference_period_kind" varchar(24) NOT NULL,
	"source_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicators" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"dataset_id" varchar(120) NOT NULL,
	"code" varchar(160) NOT NULL,
	"localized_names" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"definition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"unit" text NOT NULL,
	"frequency" varchar(24) NOT NULL,
	"is_modeled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicator_observations" (
	"indicator_id" varchar(120) NOT NULL,
	"country_iso3" char(3) NOT NULL,
	"reference_year" integer NOT NULL,
	"value" numeric(30, 10) NOT NULL,
	"published_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone NOT NULL,
	"last_updated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indicator_observations_pk" PRIMARY KEY("indicator_id","country_iso3","reference_year"),
	CONSTRAINT "indicator_observations_reference_year_check" CHECK ("indicator_observations"."reference_year" between 1800 and 2200)
);
--> statement-breakpoint
ALTER TABLE "data_collection_runs" ADD CONSTRAINT "data_collection_runs_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_observations" ADD CONSTRAINT "indicator_observations_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_observations" ADD CONSTRAINT "indicator_observations_country_iso3_countries_iso3_fk" FOREIGN KEY ("country_iso3") REFERENCES "public"."countries"("iso3") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "countries_iso2_unique_idx" ON "countries" USING btree ("iso2");--> statement-breakpoint
CREATE INDEX "data_collection_runs_dataset_started_idx" ON "data_collection_runs" USING btree ("dataset_id","started_at");--> statement-breakpoint
CREATE INDEX "datasets_source_id_idx" ON "datasets" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "indicators_dataset_code_unique_idx" ON "indicators" USING btree ("dataset_id","code");--> statement-breakpoint
CREATE INDEX "indicators_dataset_id_idx" ON "indicators" USING btree ("dataset_id");--> statement-breakpoint
CREATE INDEX "indicator_observations_country_year_idx" ON "indicator_observations" USING btree ("country_iso3","reference_year");--> statement-breakpoint
CREATE INDEX "indicator_observations_indicator_year_idx" ON "indicator_observations" USING btree ("indicator_id","reference_year");
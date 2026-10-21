CREATE TABLE "financial_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" varchar(80) NOT NULL,
	"source_asset_id" varchar(180) NOT NULL,
	"asset_type" varchar(24) NOT NULL,
	"symbol" varchar(40) NOT NULL,
	"name" text NOT NULL,
	"venue" varchar(80) DEFAULT 'global' NOT NULL,
	"country_code" char(2),
	"currency" char(3) NOT NULL,
	"unit" varchar(40) NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"sector" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_assets_type_check" CHECK ("financial_assets"."asset_type" in ('stock', 'crypto', 'metal', 'energy', 'agriculture', 'fx', 'rate', 'index')),
	CONSTRAINT "financial_assets_symbol_check" CHECK (length(trim("financial_assets"."symbol")) > 0),
	CONSTRAINT "financial_assets_currency_check" CHECK ("financial_assets"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "financial_assets_timezone_check" CHECK (length(trim("financial_assets"."timezone")) > 0)
);
--> statement-breakpoint
CREATE TABLE "financial_daily_prices" (
	"asset_id" uuid NOT NULL,
	"source_id" varchar(80) NOT NULL,
	"dataset_id" varchar(120) NOT NULL,
	"reference_date" varchar(10) NOT NULL,
	"reference_timezone" varchar(64) NOT NULL,
	"price_kind" varchar(32) DEFAULT 'close' NOT NULL,
	"open" numeric(30, 10),
	"high" numeric(30, 10),
	"low" numeric(30, 10),
	"close" numeric(30, 10) NOT NULL,
	"volume" numeric(38, 10),
	"market_cap" numeric(38, 10),
	"is_adjusted" boolean DEFAULT false NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"source_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_daily_prices_pk" PRIMARY KEY("asset_id","source_id","reference_date","price_kind"),
	CONSTRAINT "financial_daily_prices_date_check" CHECK ("financial_daily_prices"."reference_date" ~ '^\d{4}-\d{2}-\d{2}$'),
	CONSTRAINT "financial_daily_prices_ohlc_check" CHECK (("financial_daily_prices"."low" is null or "financial_daily_prices"."high" is null or "financial_daily_prices"."low" <= "financial_daily_prices"."high") and ("financial_daily_prices"."open" is null or "financial_daily_prices"."low" is null or "financial_daily_prices"."open" >= "financial_daily_prices"."low") and ("financial_daily_prices"."open" is null or "financial_daily_prices"."high" is null or "financial_daily_prices"."open" <= "financial_daily_prices"."high") and ("financial_daily_prices"."close" >= coalesce("financial_daily_prices"."low", "financial_daily_prices"."close")) and ("financial_daily_prices"."close" <= coalesce("financial_daily_prices"."high", "financial_daily_prices"."close"))),
	CONSTRAINT "financial_daily_prices_volume_check" CHECK ("financial_daily_prices"."volume" is null or "financial_daily_prices"."volume" >= 0),
	CONSTRAINT "financial_daily_prices_market_cap_check" CHECK ("financial_daily_prices"."market_cap" is null or "financial_daily_prices"."market_cap" >= 0)
);
--> statement-breakpoint
ALTER TABLE "financial_assets" ADD CONSTRAINT "financial_assets_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_daily_prices" ADD CONSTRAINT "financial_daily_prices_asset_id_financial_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."financial_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_daily_prices" ADD CONSTRAINT "financial_daily_prices_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_daily_prices" ADD CONSTRAINT "financial_daily_prices_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "financial_assets_source_asset_unique_idx" ON "financial_assets" USING btree ("source_id","source_asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_assets_natural_key_unique_idx" ON "financial_assets" USING btree ("asset_type","symbol","venue","currency");--> statement-breakpoint
CREATE INDEX "financial_assets_type_active_idx" ON "financial_assets" USING btree ("asset_type","is_active");--> statement-breakpoint
CREATE INDEX "financial_daily_prices_date_asset_idx" ON "financial_daily_prices" USING btree ("reference_date","asset_id");--> statement-breakpoint
CREATE INDEX "financial_daily_prices_dataset_date_idx" ON "financial_daily_prices" USING btree ("dataset_id","reference_date");
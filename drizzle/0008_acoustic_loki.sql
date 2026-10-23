ALTER TABLE "financial_assets" DROP CONSTRAINT "financial_assets_currency_check";--> statement-breakpoint
ALTER TABLE "financial_assets" ALTER COLUMN "currency" SET DATA TYPE varchar(8) USING btrim("currency")::varchar(8);--> statement-breakpoint
ALTER TABLE "financial_assets" ADD CONSTRAINT "financial_assets_currency_check" CHECK ("financial_assets"."currency" ~ '^[A-Z]{3,8}$');

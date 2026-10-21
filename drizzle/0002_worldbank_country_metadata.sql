ALTER TABLE "countries" ADD COLUMN "world_bank_code" varchar(12);--> statement-breakpoint
ALTER TABLE "countries" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "countries" ADD COLUMN "income_group" text;
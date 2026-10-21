ALTER TABLE "data_collection_runs" ADD COLUMN "scope" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "data_collection_runs" ADD COLUMN "inserted_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "data_collection_runs" ADD COLUMN "updated_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "data_collection_runs" ADD COLUMN "skipped_count" integer DEFAULT 0 NOT NULL;
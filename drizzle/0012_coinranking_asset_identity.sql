DROP INDEX "financial_assets_natural_key_unique_idx";--> statement-breakpoint
CREATE INDEX "financial_assets_natural_key_idx" ON "financial_assets" USING btree ("asset_type","symbol","venue","currency");--> statement-breakpoint
INSERT INTO "data_sources" (id,name,provider,source_url,license_status,license_url,financial_rights,terms_version,collection_enabled,attribution,rights_note,reviewed_at,review_due_at) VALUES
  ('coinranking-aggregate','Coinranking Aggregated Crypto Market API','Coinranking','https://coinranking.com/','unknown','https://support.coinranking.com/article/131-api-terms-conditions','{"apiAccess":"pending","publicDisplay":"pending","dbStorage":"pending","longTermRetention":"pending","userApi":"pending","csvRedistribution":"denied","derivedVisualization":"pending"}'::jsonb,NULL,false,'Data provided by Coinranking','Public sharing is mentioned in the API terms, but competing-service permission and long-term database storage scope have not been confirmed.',NULL,NULL)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
INSERT INTO "datasets" (id,source_id,name,category,reference_period_kind,source_url) VALUES
  ('coinranking-usd-daily-snapshots','coinranking-aggregate','Coinranking USD daily observed aggregate prices','crypto','daily','https://coinranking.com/api/documentation/coins/coins')
ON CONFLICT (id) DO NOTHING;

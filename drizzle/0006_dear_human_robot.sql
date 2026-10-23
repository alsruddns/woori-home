ALTER TABLE "data_sources" ADD COLUMN "financial_rights" jsonb DEFAULT '{"apiAccess":"pending","publicDisplay":"pending","dbStorage":"pending","longTermRetention":"pending","userApi":"pending","csvRedistribution":"pending","derivedVisualization":"pending"}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "terms_version" text;--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "review_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "collection_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_financial_rights_check" CHECK (jsonb_typeof("data_sources"."financial_rights") = 'object' and "data_sources"."financial_rights" ?& array['apiAccess','publicDisplay','dbStorage','longTermRetention','userApi','csvRedistribution','derivedVisualization'] and "data_sources"."financial_rights"->>'apiAccess' in ('confirmed','pending','restricted','denied') and "data_sources"."financial_rights"->>'publicDisplay' in ('confirmed','pending','restricted','denied') and "data_sources"."financial_rights"->>'dbStorage' in ('confirmed','pending','restricted','denied') and "data_sources"."financial_rights"->>'longTermRetention' in ('confirmed','pending','restricted','denied') and "data_sources"."financial_rights"->>'userApi' in ('confirmed','pending','restricted','denied') and "data_sources"."financial_rights"->>'csvRedistribution' in ('confirmed','pending','restricted','denied') and "data_sources"."financial_rights"->>'derivedVisualization' in ('confirmed','pending','restricted','denied'));
--> statement-breakpoint
INSERT INTO "data_sources" (id,name,provider,source_url,license_status,license_url,rights_note) VALUES
  ('upbit-quotation','Upbit Quotation API','Upbit','https://docs.upbit.com/kr/reference','unknown','https://www.upbit.com/open_api_agreement','Public quotation endpoints are technically accessible; API-use permission and commercial display, storage, redistribution, and visualization rights remain pending.'),
  ('bithumb-public','Bithumb Public API','Bithumb','https://apidocs.bithumb.com/','unknown','https://apidocs.bithumb.com/','Public quotation endpoints are technically accessible; API-use permission and commercial display, storage, redistribution, and visualization rights remain pending.'),
  ('binance-spot-market-data','Binance Spot Market Data','Binance','https://developers.binance.com/en/docs/products/spot/rest-api','unknown','https://developers.binance.com/en/docs/products/spot/PROD-TERMS-OF-USE','Spot API terms and commercial public display/storage rights require provider review.'),
  ('coingecko-markets','CoinGecko API (global aggregate)','CoinGecko','https://www.coingecko.com/en/api','unknown','https://www.coingecko.com/en/api_terms','Free Demo lacks commercial display rights; paid plan commercial display requires attribution, storage refresh at least every 24h, deletion after termination, and separate redistribution rights.'),
  ('twelvedata-us-equities','Twelve Data US Equities','Twelve Data','https://twelvedata.com/docs','unknown','https://twelvedata.com/terms','Paid API access, external display, storage, and redistribution require an applicable plan/add-on or written agreement.'),
  ('fsc-krx-stock-prices','FSC / KRX Stock Price Open API','Financial Services Commission / Korea Exchange','https://www.data.go.kr/data/15094808/openapi.do','restricted','https://www.data.go.kr/catalog/15094808/openapi.json','Open API license is public attribution, non-commercial, no-modification; commercial use requires a KRX Data Marketplace purchase and scope confirmation.')
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
INSERT INTO "datasets" (id,source_id,name,category,reference_period_kind,source_url) VALUES
  ('upbit-krw-daily-candles','upbit-quotation','Upbit KRW daily candles','crypto','daily','https://docs.upbit.com/kr/reference'),
  ('bithumb-krw-daily-candles','bithumb-public','Bithumb KRW daily candles','crypto','daily','https://apidocs.bithumb.com/'),
  ('binance-usdt-daily-candles','binance-spot-market-data','Binance Spot USDT daily candles','crypto','daily','https://developers.binance.com/en/docs/products/spot/rest-api'),
  ('coingecko-usd-daily-prices','coingecko-markets','CoinGecko USD aggregate daily prices','crypto','daily','https://www.coingecko.com/en/api'),
  ('twelvedata-us-daily-prices','twelvedata-us-equities','Twelve Data US equities daily prices','stock','daily','https://twelvedata.com/docs'),
  ('fsc-krx-daily-stock-prices','fsc-krx-stock-prices','FSC / KRX daily stock prices','stock','daily','https://www.data.go.kr/data/15094808/openapi.do')
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
UPDATE "data_sources" SET "financial_rights" = '{"apiAccess":"confirmed","publicDisplay":"denied","dbStorage":"restricted","longTermRetention":"restricted","userApi":"denied","csvRedistribution":"denied","derivedVisualization":"denied"}'::jsonb
WHERE id='fsc-krx-stock-prices' AND "terms_version" IS NULL;

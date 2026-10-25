CREATE TABLE IF NOT EXISTS research_source_files (
  id bigserial PRIMARY KEY,
  source_name text NOT NULL DEFAULT 'Binance Vision',
  archive_path text NOT NULL UNIQUE,
  sha256 char(64) NOT NULL,
  archive_bytes bigint NOT NULL CHECK (archive_bytes > 0),
  candle_rows integer NOT NULL CHECK (candle_rows >= 0),
  verified_at timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_crypto_daily (
  exchange text NOT NULL DEFAULT 'binance-vision-spot',
  symbol text NOT NULL,
  market text NOT NULL,
  quote_currency text NOT NULL DEFAULT 'USDT',
  reference_date date NOT NULL,
  open numeric NOT NULL CHECK (open > 0),
  high numeric NOT NULL CHECK (high > 0),
  low numeric NOT NULL CHECK (low > 0),
  close numeric NOT NULL CHECK (close > 0),
  base_volume numeric NOT NULL CHECK (base_volume >= 0),
  quote_volume numeric NOT NULL CHECK (quote_volume >= 0),
  trade_count bigint NOT NULL CHECK (trade_count >= 0),
  source_file_id bigint NOT NULL REFERENCES research_source_files(id),
  collected_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exchange, market, reference_date),
  CHECK (high >= low AND open BETWEEN low AND high AND close BETWEEN low AND high),
  CHECK (market = symbol || quote_currency)
);

CREATE INDEX IF NOT EXISTS research_crypto_daily_symbol_date_idx
  ON research_crypto_daily (symbol, reference_date DESC);

CREATE TABLE IF NOT EXISTS research_ingest_runs (
  id bigserial PRIMARY KEY,
  mode text NOT NULL CHECK (mode IN ('backfill', 'daily')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  requested_files integer NOT NULL DEFAULT 0,
  downloaded_files integer NOT NULL DEFAULT 0,
  verified_files integer NOT NULL DEFAULT 0,
  missing_files integer NOT NULL DEFAULT 0,
  failed_files integer NOT NULL DEFAULT 0,
  upserted_rows integer NOT NULL DEFAULT 0,
  missing_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  failure_details jsonb NOT NULL DEFAULT '[]'::jsonb
);

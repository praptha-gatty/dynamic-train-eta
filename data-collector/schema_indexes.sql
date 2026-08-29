-- ==============================================================================
-- DATABASE PERFORMANCE INDEXES FOR DYNAMIC TRAIN ETA
-- ==============================================================================
-- Purpose: Optimize query performance for multi-train search, paginated history,
-- live ETA retrieval, and station lookups on large datasets.
-- ==============================================================================

-- 1. Index for train history lookups by train number and journey date
CREATE INDEX IF NOT EXISTS idx_train_history_number_date 
ON public.train_history(train_number, journey_date);

-- 2. Index for filtering recent snapshots by API update timestamp
CREATE INDEX IF NOT EXISTS idx_train_history_api_updated_at 
ON public.train_history(api_updated_at DESC);

-- 3. Index for filtering recent snapshots by system capture timestamp
CREATE INDEX IF NOT EXISTS idx_train_history_captured_at 
ON public.train_history(captured_at DESC);

-- 4. Index for fast station code lookups
CREATE INDEX IF NOT EXISTS idx_stations_station_code 
ON public.stations(station_code);

-- 5. Index for train route station sequence lookups
CREATE INDEX IF NOT EXISTS idx_routes_train_seq 
ON public.routes(train_number, station_sequence);

-- 6. Index for active train number lookups
CREATE INDEX IF NOT EXISTS idx_trains_number 
ON public.trains(train_number);

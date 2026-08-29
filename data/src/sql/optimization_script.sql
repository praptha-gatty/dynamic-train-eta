-- ==============================================================================
-- SUPABASE IDEMPOTENT SQL OPTIMIZATION SCRIPT FOR DYNAMIC TRAIN ETA
-- ==============================================================================
-- Purpose: Safely drop existing policies if present, enable RLS, grant public SELECT access,
-- and create performance indexes for train_number and next_station_sequence ASC queries.
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.train_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.train_current_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if present to prevent ERROR 42710 (policy already exists)
DROP POLICY IF EXISTS "Public Read train_history" ON public.train_history;
DROP POLICY IF EXISTS "Public Read train_current_status" ON public.train_current_status;
DROP POLICY IF EXISTS "Public Read trains" ON public.trains;
DROP POLICY IF EXISTS "Public Read stations" ON public.stations;

-- 3. Create Public Read SELECT Policies for all clients (anon & authenticated)
CREATE POLICY "Public Read train_history" 
ON public.train_history FOR SELECT 
USING (true);

CREATE POLICY "Public Read train_current_status" 
ON public.train_current_status FOR SELECT 
USING (true);

CREATE POLICY "Public Read trains" 
ON public.trains FOR SELECT 
USING (true);

CREATE POLICY "Public Read stations" 
ON public.stations FOR SELECT 
USING (true);

-- 4. Create Performance Indexes for Fast Train Telemetry Queries
CREATE INDEX IF NOT EXISTS idx_train_history_num_next_seq 
ON public.train_history (train_number, next_station_sequence ASC);

CREATE INDEX IF NOT EXISTS idx_train_history_num_seq_asc 
ON public.train_history (train_number, station_sequence ASC);

CREATE INDEX IF NOT EXISTS idx_train_current_status_train 
ON public.train_current_status (train_number);

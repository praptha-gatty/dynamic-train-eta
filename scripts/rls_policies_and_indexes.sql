-- ==============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES & PERFORMANCE INDEXES
-- ==============================================================================
-- Purpose: Enable RLS on all tables, grant public read SELECT permissions,
-- and create performance indexes to eliminate row-limit cutoffs.
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.train_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.train_current_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any to ensure clean idempotent execution
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

-- 4. Create Performance Indexes for Fast Filtered Lookups
CREATE INDEX IF NOT EXISTS idx_train_history_number_date 
ON public.train_history (train_number, journey_date);

CREATE INDEX IF NOT EXISTS idx_train_history_number_seq 
ON public.train_history (train_number, station_sequence);

CREATE INDEX IF NOT EXISTS idx_train_current_status_lookup 
ON public.train_current_status (train_number, journey_date);

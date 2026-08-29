-- ==============================================================================
-- DATABASE INDEX OPTIMIZATION FOR MULTI-TRAIN DASHBOARD & STATION TIMELINES
-- ==============================================================================
-- Purpose: Optimize query performance for multi-train dashboard status queries
-- and strict train_number + station_sequence station timeline lookups.
-- ==============================================================================

-- 1. Index on train_history for train_number and station_sequence ordering
CREATE INDEX IF NOT EXISTS idx_train_history_num_seq 
ON public.train_history (train_number, station_sequence);

-- 2. Index on train_current_status for train_number lookups
CREATE INDEX IF NOT EXISTS idx_train_current_status_train 
ON public.train_current_status (train_number);

-- 3. Composite Index on train_history for train_number and captured_at
CREATE INDEX IF NOT EXISTS idx_train_history_num_captured 
ON public.train_history (train_number, captured_at DESC);

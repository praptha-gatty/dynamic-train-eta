-- Run these parts only (skip CREATE TABLE if exists):

-- 1. Add missing columns to train_history (safe - IF NOT EXISTS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'train_history' AND column_name = 'is_current_location') THEN
        ALTER TABLE public.train_history ADD COLUMN is_current_location BOOLEAN DEFAULT FALSE;
    END IF;
    -- ... (rest of column additions)
END $$;

-- 2. Add unique index (safe - IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS idx_train_history_unique_obs 
ON public.train_history (train_number, journey_date, station_sequence, captured_at);

-- 3. Add performance indexes (safe - IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_train_current_status_lookup 
ON public.train_current_status (train_number, journey_date);

CREATE INDEX IF NOT EXISTS idx_train_history_current_loc
ON public.train_history (train_number, journey_date, is_current_location)
WHERE is_current_location = TRUE;

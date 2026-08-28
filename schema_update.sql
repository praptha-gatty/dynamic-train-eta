-- ============================================================
-- SUPABASE SCHEMA UPDATE: DYNAMIC TRAIN ETA PIPELINE
-- Enforces single valid current station per train journey
-- and prevents duplicate historical observation records.
-- ============================================================

-- 1. Create train_current_status table to store strictly ONE current location per train journey
CREATE TABLE IF NOT EXISTS public.train_current_status (
    train_number TEXT NOT NULL,
    journey_date DATE NOT NULL,
    train_name TEXT,
    current_station_code TEXT,
    current_station_name TEXT,
    current_station_sequence INT,
    previous_station TEXT,
    next_station TEXT,
    next_station_code TEXT,
    next_station_sequence INT,
    delay_minutes INT,
    speed_kmph NUMERIC,
    distance_remaining_km NUMERIC,
    running_status TEXT,
    is_halt BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'IN_TRANSIT', -- Values: 'IN_TRANSIT', 'SCHEDULED', 'COMPLETED', 'CONFLICT_FLAGGED'
    observed_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (train_number, journey_date)
);

-- Enable RLS and create policy for anon access
ALTER TABLE public.train_current_status ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read/write on train_current_status'
    ) THEN
        CREATE POLICY "Allow public read/write on train_current_status" 
        ON public.train_current_status FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. Add missing columns to train_history if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'train_history' AND column_name = 'is_current_location'
    ) THEN
        ALTER TABLE public.train_history ADD COLUMN is_current_location BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'train_history' AND column_name = 'is_halt'
    ) THEN
        ALTER TABLE public.train_history ADD COLUMN is_halt BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'train_history' AND column_name = 'api_updated_at'
    ) THEN
        ALTER TABLE public.train_history ADD COLUMN api_updated_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'train_history' AND column_name = 'arrival_delay_minutes'
    ) THEN
        ALTER TABLE public.train_history ADD COLUMN arrival_delay_minutes INT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'train_history' AND column_name = 'departure_delay_minutes'
    ) THEN
        ALTER TABLE public.train_history ADD COLUMN departure_delay_minutes INT;
    END IF;
END $$;

-- 3. Cleanup existing duplicate observation records in train_history before applying unique index
DELETE FROM public.train_history
WHERE history_id NOT IN (
    SELECT MAX(history_id)
    FROM public.train_history
    GROUP BY train_number, journey_date, station_sequence, captured_at
);

-- 4. Add unique index/constraint to train_history to guarantee snapshot idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_train_history_unique_obs 
ON public.train_history (train_number, journey_date, station_sequence, captured_at);

-- 5. Add performance indexes for lookups
CREATE INDEX IF NOT EXISTS idx_train_current_status_lookup 
ON public.train_current_status (train_number, journey_date);

CREATE INDEX IF NOT EXISTS idx_train_history_current_loc
ON public.train_history (train_number, journey_date, is_current_location)
WHERE is_current_location = TRUE;

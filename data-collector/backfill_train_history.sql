-- ==============================================================================
-- SAFE & IDEMPOTENT BACKFILL SCRIPT FOR public.train_history
-- ==============================================================================
-- Purpose: Safely populate missing metadata (train_name, journey_date, station_code,
-- station_sequence, next_station_code, next_station_sequence, distance_from_origin_km,
-- is_current_location) for historic rows where these columns are NULL.
--
-- Rules:
-- 1. Never overwrites existing non-NULL data.
-- 2. Never invents data.
-- 3. Performs exact relational matches against public.trains, public.stations, and public.routes.
-- 4. Safe to execute multiple times (idempotent).
-- ==============================================================================

-- 1. Backfill train_name from public.trains table
UPDATE public.train_history th
SET train_name = t.train_name
FROM public.trains t
WHERE th.train_name IS NULL
  AND th.train_number = t.train_number;

-- 2. Backfill journey_date from captured_at timestamp if NULL
UPDATE public.train_history
SET journey_date = captured_at::date
WHERE journey_date IS NULL
  AND captured_at IS NOT NULL;

-- 3. Backfill station_code from public.stations table by matching station_name
UPDATE public.train_history th
SET station_code = s.station_code
FROM public.stations s
WHERE th.station_code IS NULL
  AND th.current_station IS NOT NULL
  AND LOWER(TRIM(th.current_station)) = LOWER(TRIM(s.station_name));

-- 4. Backfill station_sequence & distance_from_origin_km from public.routes table
UPDATE public.train_history th
SET 
  station_sequence = COALESCE(th.station_sequence, r.station_sequence),
  distance_from_origin_km = COALESCE(th.distance_from_origin_km, r.distance_from_source)
FROM public.routes r
WHERE (th.station_sequence IS NULL OR th.distance_from_origin_km IS NULL)
  AND th.station_code IS NOT NULL
  AND th.train_number = r.train_number
  AND th.station_code = r.station_code;

-- 5. Backfill next_station_code & next_station_sequence from public.routes table
UPDATE public.train_history th
SET 
  next_station_code = COALESCE(th.next_station_code, nr.station_code),
  next_station_sequence = COALESCE(th.next_station_sequence, nr.station_sequence)
FROM public.routes nr
WHERE (th.next_station_code IS NULL OR th.next_station_sequence IS NULL)
  AND th.station_sequence IS NOT NULL
  AND th.train_number = nr.train_number
  AND nr.station_sequence = th.station_sequence + 1;

-- 6. Set is_current_location default to false for historic snapshot rows if NULL
UPDATE public.train_history
SET is_current_location = FALSE
WHERE is_current_location IS NULL;

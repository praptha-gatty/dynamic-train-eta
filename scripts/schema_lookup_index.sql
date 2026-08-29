-- ==============================================================================
-- COMPOSITE LOOKUP INDEX FOR public.train_history
-- ==============================================================================
-- Purpose: Optimize train_number and journey_date filtering performance
-- for on-demand fetch lookups and historical sequence queries.
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_train_history_lookup 
ON public.train_history (train_number, journey_date);

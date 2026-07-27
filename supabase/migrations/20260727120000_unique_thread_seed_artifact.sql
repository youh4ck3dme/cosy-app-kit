-- Add column for instant seed identification
ALTER TABLE public.artifacts
ADD COLUMN IF NOT EXISTS is_instant_seed boolean NOT NULL DEFAULT false;

-- Drop legacy broad index if exists
DROP INDEX IF EXISTS public.idx_artifacts_unique_thread_seed;

-- Create partial UNIQUE index ONLY for instant seed artifacts per thread
CREATE UNIQUE INDEX IF NOT EXISTS idx_artifacts_unique_thread_seed
ON public.artifacts (thread_id)
WHERE is_instant_seed = true;

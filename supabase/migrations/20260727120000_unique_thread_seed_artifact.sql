-- Prevent duplicate seed artifacts per thread across distributed server instances (TOCTOU multi-instance safety)
CREATE UNIQUE INDEX IF NOT EXISTS idx_artifacts_unique_thread_seed
ON public.artifacts (thread_id)
WHERE entry_path = 'index.html';

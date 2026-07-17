-- Multi-file artifact support
ALTER TABLE public.artifacts
  ADD COLUMN IF NOT EXISTS files jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS entry_path text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Public read for shared artifacts (only when explicitly public)
GRANT SELECT ON public.artifacts TO anon;

DROP POLICY IF EXISTS "public artifacts readable" ON public.artifacts;
CREATE POLICY "public artifacts readable"
  ON public.artifacts FOR SELECT
  TO anon
  USING (is_public = true);

-- Per-thread memory for the agent
CREATE TABLE IF NOT EXISTS public.thread_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(thread_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_memory TO authenticated;
GRANT ALL ON public.thread_memory TO service_role;

ALTER TABLE public.thread_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "thread_memory via own thread" ON public.thread_memory;
CREATE POLICY "thread_memory via own thread"
  ON public.thread_memory FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.threads t WHERE t.id = thread_memory.thread_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.threads t WHERE t.id = thread_memory.thread_id AND t.user_id = auth.uid()));

DROP TRIGGER IF EXISTS thread_memory_updated_at ON public.thread_memory;
CREATE TRIGGER thread_memory_updated_at
  BEFORE UPDATE ON public.thread_memory
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

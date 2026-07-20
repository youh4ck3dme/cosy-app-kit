-- G2: artifact version history + memory index (Grok)
-- Cursor phase H consumes listArtifactVersions / restoreArtifactVersion server fns.

CREATE TABLE IF NOT EXISTS public.artifact_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  content text NOT NULL DEFAULT '',
  entry_path text,
  title text,
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'tool'
    CHECK (source IN ('tool', 'fence', 'user_save', 'restore')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artifact_versions_artifact_created_idx
  ON public.artifact_versions(artifact_id, created_at DESC);

GRANT SELECT, INSERT ON public.artifact_versions TO authenticated;
GRANT ALL ON public.artifact_versions TO service_role;

ALTER TABLE public.artifact_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "artifact_versions via own artifact" ON public.artifact_versions;
CREATE POLICY "artifact_versions via own artifact"
  ON public.artifact_versions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.artifacts a
      JOIN public.threads t ON t.id = a.thread_id
      WHERE a.id = artifact_versions.artifact_id
        AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.artifacts a
      JOIN public.threads t ON t.id = a.thread_id
      WHERE a.id = artifact_versions.artifact_id
        AND t.user_id = auth.uid()
    )
  );

-- Speed up memory load on every chat turn
CREATE INDEX IF NOT EXISTS thread_memory_thread_updated_idx
  ON public.thread_memory(thread_id, updated_at DESC);

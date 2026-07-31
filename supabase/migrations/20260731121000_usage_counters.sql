-- T14: usage_counters for repair-pass / message / token metering (Artifact Insurance)
-- Writes: service_role only. Authenticated may SELECT own rows.

CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id uuid NOT NULL,
  period char(7) NOT NULL, -- 'YYYY-MM'
  messages int NOT NULL DEFAULT 0,
  repair_passes int NOT NULL DEFAULT 0,
  ai_tokens bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period)
);

CREATE INDEX IF NOT EXISTS usage_counters_period_idx ON public.usage_counters (period);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_counters own select" ON public.usage_counters;
CREATE POLICY "usage_counters own select"
  ON public.usage_counters
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;

-- Atomic consume: increment repair_passes only if under limit.
-- Returns true if consumed, false if over quota (or invalid args).
CREATE OR REPLACE FUNCTION public.consume_repair_pass(p_user_id uuid, p_period char(7), p_limit int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count int;
BEGIN
  IF p_user_id IS NULL OR p_period IS NULL OR p_limit IS NULL OR p_limit < 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.usage_counters (user_id, period, repair_passes, updated_at)
  VALUES (p_user_id, p_period, 0, now())
  ON CONFLICT (user_id, period) DO NOTHING;

  SELECT repair_passes INTO current_count
  FROM public.usage_counters
  WHERE user_id = p_user_id AND period = p_period
  FOR UPDATE;

  IF current_count >= p_limit THEN
    RETURN false;
  END IF;

  UPDATE public.usage_counters
  SET repair_passes = repair_passes + 1,
      updated_at = now()
  WHERE user_id = p_user_id AND period = p_period;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_repair_pass(uuid, char, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_repair_pass(uuid, char, int) TO service_role;

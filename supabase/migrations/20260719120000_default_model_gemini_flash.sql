-- Align DB defaults with app DEFAULT_MODEL (google/gemini-3-flash-preview).
-- Existing threads keep their model; /api/chat falls back unknown ids at runtime.

alter table public.threads
  alter column model set default 'google/gemini-3-flash-preview';

alter table public.agent_settings
  alter column default_model set default 'google/gemini-3-flash-preview';

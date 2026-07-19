-- Switch defaults to Mistral (no OpenAI / Gemini / Lovable gateway model ids).
-- Existing threads: app resolveModelId() remaps unknown ids at chat time.

alter table public.threads
  alter column model set default 'mistral-large-latest';

alter table public.agent_settings
  alter column default_model set default 'mistral-large-latest';

-- Optional: rewrite known legacy gateway ids on existing rows
update public.threads
set model = 'mistral-large-latest'
where model like 'openai/%'
   or model like 'google/%'
   or model like 'anthropic/%';

update public.agent_settings
set default_model = 'mistral-large-latest'
where default_model like 'openai/%'
   or default_model like 'google/%'
   or default_model like 'anthropic/%';

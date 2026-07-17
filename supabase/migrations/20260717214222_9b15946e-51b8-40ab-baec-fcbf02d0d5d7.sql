
-- Roles
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Updated_at trigger helper
create or replace function public.tg_set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- Threads
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  model text not null default 'openai/gpt-5.5',
  temperature numeric not null default 0.7,
  system_prompt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index threads_user_updated_idx on public.threads(user_id, updated_at desc);
grant select, insert, update, delete on public.threads to authenticated;
grant all on public.threads to service_role;
alter table public.threads enable row level security;
create policy "own threads all" on public.threads for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger threads_updated_at before update on public.threads
  for each row execute function public.tg_set_updated_at();

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  parts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index messages_thread_created_idx on public.messages(thread_id, created_at);
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "messages via own thread" on public.messages for all to authenticated
  using (exists (select 1 from public.threads t where t.id = thread_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.threads t where t.id = thread_id and t.user_id = auth.uid()));

-- Artifacts
create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  kind text not null check (kind in ('html','markdown','code')),
  title text not null default 'Untitled',
  content text not null default '',
  created_at timestamptz not null default now()
);
create index artifacts_thread_created_idx on public.artifacts(thread_id, created_at desc);
grant select, insert, update, delete on public.artifacts to authenticated;
grant all on public.artifacts to service_role;
alter table public.artifacts enable row level security;
create policy "artifacts via own thread" on public.artifacts for all to authenticated
  using (exists (select 1 from public.threads t where t.id = thread_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.threads t where t.id = thread_id and t.user_id = auth.uid()));

-- Agent settings (per user)
create table public.agent_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_model text not null default 'openai/gpt-5.5',
  default_temperature numeric not null default 0.7,
  default_system_prompt text not null default 'You are Builder, a helpful, precise AI agent. When the user asks for a webpage, component, or design, respond with a short explanation and then emit a full self-contained HTML document inside a ```html fenced block so it can be rendered in the live canvas. Use inline <style> and modern, tasteful design. Prefer semantic HTML and accessible markup.',
  tools jsonb not null default '{"create_artifact": true, "web_search": false, "code_interpreter": false}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.agent_settings to authenticated;
grant all on public.agent_settings to service_role;
alter table public.agent_settings enable row level security;
create policy "own agent settings" on public.agent_settings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger agent_settings_updated_at before update on public.agent_settings
  for each row execute function public.tg_set_updated_at();

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.artifacts;

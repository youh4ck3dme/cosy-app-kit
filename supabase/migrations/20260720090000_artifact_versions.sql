-- Artifact version history: every content change to an artifact snapshots the
-- previous state, giving users time-travel + restore on the canvas.

create table public.artifact_versions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  content text not null default '',
  files jsonb,
  entry_path text,
  label text,
  created_at timestamptz not null default now()
);
create index artifact_versions_artifact_idx
  on public.artifact_versions(artifact_id, created_at desc);

grant select, insert, delete on public.artifact_versions to authenticated;
grant all on public.artifact_versions to service_role;
alter table public.artifact_versions enable row level security;
create policy "artifact versions via own thread" on public.artifact_versions
  for all to authenticated
  using (exists (
    select 1 from public.artifacts a
    join public.threads t on t.id = a.thread_id
    where a.id = artifact_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.artifacts a
    join public.threads t on t.id = a.thread_id
    where a.id = artifact_id and t.user_id = auth.uid()
  ));

-- Snapshot the OLD state before an update rewrites content/files.
-- Guards: only when content actually changed, and rate-limited to one snapshot
-- per 15s per artifact so streaming regenerations don't spam versions.
create or replace function public.snapshot_artifact_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.content is distinct from new.content)
     or (old.files is distinct from new.files) then
    if not exists (
      select 1 from public.artifact_versions v
      where v.artifact_id = old.id
        and v.created_at > now() - interval '15 seconds'
    ) then
      insert into public.artifact_versions (artifact_id, content, files, entry_path)
      values (old.id, old.content, old.files, old.entry_path);
      -- Cap history at the latest 50 versions per artifact.
      delete from public.artifact_versions v
      where v.artifact_id = old.id
        and v.id not in (
          select v2.id from public.artifact_versions v2
          where v2.artifact_id = old.id
          order by v2.created_at desc
          limit 50
        );
    end if;
  end if;
  return new;
end;
$$;

create trigger artifact_version_snapshot
  before update on public.artifacts
  for each row
  execute function public.snapshot_artifact_version();

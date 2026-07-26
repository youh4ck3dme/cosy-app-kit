# Supabase migrations (human / Lovable)

## Pending for versions UI (Cursor phase H)

**File:** `supabase/migrations/20260720120000_artifact_versions.sql`

Creates:

- `public.artifact_versions` (+ RLS + index)
- index `thread_memory_thread_updated_idx`

### How to apply

1. **Lovable Cloud** — open Supabase SQL editor for the linked project, paste file contents, run.  
2. Or **Supabase CLI** (if linked): `supabase db push` / dashboard SQL.  
3. Confirm:

```sql
select to_regclass('public.artifact_versions');
-- should return public.artifact_versions
```

Until applied: `listArtifactVersions` may error; Canvas timeline should show friendly empty/error.

### Already applied historically

See `supabase/migrations/20260717*` and model default migrations — do not re-run casually.

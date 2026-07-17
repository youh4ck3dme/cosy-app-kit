
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.tg_set_updated_at() from public, anon, authenticated;

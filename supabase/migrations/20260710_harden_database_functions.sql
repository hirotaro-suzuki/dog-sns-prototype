-- Harden database functions reported by Supabase Security Advisor without
-- changing their bodies, event triggers, or service_role privileges.

begin;

alter function public.set_updated_at()
  set search_path = pg_catalog;

revoke execute on function public.set_updated_at()
from public, anon, authenticated;

do $$
begin
  if pg_catalog.to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'alter function public.rls_auto_enable() set search_path = pg_catalog';
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

commit;

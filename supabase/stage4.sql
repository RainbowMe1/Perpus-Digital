-- Expose only the aggregate member count to authenticated, approved users.
-- Run in the existing Supabase project's SQL Editor.

create or replace function public.get_total_member_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)
  from public.members
  where public.is_approved_user();
$$;

revoke all on function public.get_total_member_count() from public, anon;
grant execute on function public.get_total_member_count() to authenticated;

-- Expand staff permissions, add a read-only member directory, and enable profile photos.
-- Run in the existing Supabase project after stage3.sql. Safe to run again.

alter table public.profiles
  add column if not exists avatar_url text;

create or replace function public.has_staff_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'librarian', 'staff')
      and approval_status = 'approved'
  );
$$;

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

create or replace function public.get_member_directory()
returns table (
  id uuid,
  full_name text,
  member_number text,
  category public.member_category
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.full_name, m.member_number, m.category
  from public.members m
  where public.is_approved_user()
  order by m.full_name;
$$;

create or replace function public.update_my_profile_avatar(p_avatar_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if not public.is_approved_user() then
    raise exception 'Akun belum disetujui';
  end if;
  if p_avatar_path is null
    or (storage.foldername(p_avatar_path))[1] <> v_user_id::text
    or array_length(storage.foldername(p_avatar_path), 1) <> 1 then
    raise exception 'Path foto profil tidak valid';
  end if;

  update public.profiles set avatar_url = p_avatar_path where id = v_user_id;
  if not found then raise exception 'Profil akun tidak ditemukan'; end if;

  update public.members set avatar = p_avatar_path where user_id = v_user_id;
end;
$$;

revoke all on function public.get_total_member_count() from public, anon;
revoke all on function public.get_member_directory() from public, anon;
revoke all on function public.update_my_profile_avatar(text) from public, anon;
grant execute on function public.get_total_member_count() to authenticated;
grant execute on function public.get_member_directory() to authenticated;
grant execute on function public.update_my_profile_avatar(text) to authenticated;
grant execute on function public.has_staff_access() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own avatar metadata" on storage.objects;
create policy "Users can read own avatar metadata"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.is_approved_user()
    and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.is_approved_user()
    and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and public.is_approved_user()
    and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and public.is_approved_user()
    and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and public.is_approved_user()
    and (storage.foldername(name))[1] = (select auth.uid())::text);

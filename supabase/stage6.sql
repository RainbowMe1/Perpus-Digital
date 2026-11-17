-- Add public book-cover storage and expose member profile photos in the directory.
-- Run this once in the existing Supabase project after stage5.sql.

drop function if exists public.get_member_directory();
create function public.get_member_directory()
returns table (
  id uuid,
  full_name text,
  member_number text,
  category public.member_category,
  avatar text
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.full_name, m.member_number, m.category, m.avatar
  from public.members m
  where public.is_approved_user()
  order by m.full_name;
$$;

revoke all on function public.get_member_directory() from public, anon;
grant execute on function public.get_member_directory() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-covers', 'book-covers', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view book covers" on storage.objects;
create policy "Anyone can view book covers"
  on storage.objects for select to public
  using (bucket_id = 'book-covers');

drop policy if exists "Staff can upload book covers" on storage.objects;
create policy "Staff can upload book covers"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'book-covers' and public.has_staff_access());

drop policy if exists "Staff can update book covers" on storage.objects;
create policy "Staff can update book covers"
  on storage.objects for update to authenticated
  using (bucket_id = 'book-covers' and public.has_staff_access())
  with check (bucket_id = 'book-covers' and public.has_staff_access());

drop policy if exists "Staff can delete book covers" on storage.objects;
create policy "Staff can delete book covers"
  on storage.objects for delete to authenticated
  using (bucket_id = 'book-covers' and public.has_staff_access());

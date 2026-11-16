create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'librarian', 'student', 'teacher', 'staff');
create type public.approval_status as enum ('pending', 'approved', 'rejected');
create type public.member_category as enum ('student', 'teacher', 'staff');

create sequence public.member_number_seq start 1;
create sequence public.transaction_code_seq start 1;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.app_role not null default 'student',
  approval_status public.approval_status not null default 'pending',
  member_category public.member_category not null default 'student',
  class_or_department text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  isbn text not null default '',
  book_code text not null unique,
  publisher text not null default '',
  publication_year integer not null default extract(year from current_date)::integer,
  category text not null default 'Umum',
  description text not null default '',
  cover_image text not null default '',
  total_stock integer not null default 1 check (total_stock >= 0),
  available_stock integer not null default 1 check (available_stock >= 0 and available_stock <= total_stock),
  shelf_location text not null default '',
  is_digital boolean not null default false,
  digital_file_url text,
  page_count integer,
  rating numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  member_number text not null unique default ('MBR-' || lpad(nextval('public.member_number_seq')::text, 6, '0')),
  category public.member_category not null default 'student',
  class_or_department text not null default '',
  email text not null,
  phone text not null default '',
  registration_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  avatar text,
  active_loans integer not null default 0 check (active_loans >= 0),
  total_borrowed integer not null default 0 check (total_borrowed >= 0),
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null unique,
  member_id uuid not null references public.members(id) on delete restrict,
  member_name text not null,
  member_number text not null,
  borrowing_date date not null default current_date,
  due_date date not null,
  return_date date,
  status text not null default 'active' check (status in ('active', 'returned', 'overdue', 'extended')),
  extended_days integer,
  fine numeric(12, 2),
  created_at timestamptz not null default now()
);

create table public.transaction_books (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete restrict,
  title text not null,
  book_code text not null,
  cover_image text not null default '',
  primary key (transaction_id, book_id)
);

create or replace function public.is_approved_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and approval_status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and approval_status = 'approved'
  );
$$;

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
      and role in ('admin', 'librarian')
      and approval_status = 'approved'
  );
$$;

create or replace function public.owns_member(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members
    where id = p_member_id and user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_transaction(p_transaction_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.transactions t
    join public.members m on m.id = t.member_id
    where t.id = p_transaction_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category public.member_category;
begin
  v_category := case new.raw_user_meta_data ->> 'member_category'
    when 'teacher' then 'teacher'::public.member_category
    when 'staff' then 'staff'::public.member_category
    else 'student'::public.member_category
  end;

  insert into public.profiles (
    id, email, full_name, role, approval_status, member_category,
    class_or_department, phone
  ) values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    v_category::text::public.app_role,
    'pending',
    v_category,
    coalesce(new.raw_user_meta_data ->> 'class_or_department', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

create or replace function public.create_member_for_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.members (
    user_id, full_name, category, class_or_department, email, phone, status
  ) values (
    new.id,
    new.full_name,
    new.member_category,
    new.class_or_department,
    new.email,
    new.phone,
    case when new.approval_status = 'approved' then 'active' else 'inactive' end
  );
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.create_member_for_profile();

create or replace function public.sync_member_approval_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.approval_status is distinct from old.approval_status then
    update public.members
    set status = case when new.approval_status = 'approved' then 'active' else 'inactive' end
    where user_id = new.id and status <> 'suspended';
  end if;
  return new;
end;
$$;

create trigger on_profile_approval_changed
  after update of approval_status on public.profiles
  for each row execute procedure public.sync_member_approval_status();

create or replace function public.create_borrowing(
  p_member_id uuid,
  p_book_ids uuid[],
  p_borrowing_date date,
  p_due_date date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
  v_book_id uuid;
  v_book public.books%rowtype;
  v_transaction_id uuid;
begin
  if not public.has_staff_access() then
    raise exception 'Hanya admin atau pustakawan yang dapat mencatat peminjaman';
  end if;
  if p_book_ids is null or cardinality(p_book_ids) < 1 or cardinality(p_book_ids) > 3 then
    raise exception 'Peminjaman harus berisi 1 sampai 3 buku';
  end if;
  if (select count(distinct selected.book_id) from unnest(p_book_ids) as selected(book_id)) <> cardinality(p_book_ids) then
    raise exception 'Buku yang sama tidak dapat dipilih lebih dari sekali';
  end if;
  if p_due_date < p_borrowing_date then
    raise exception 'Tanggal jatuh tempo harus setelah tanggal peminjaman';
  end if;

  select * into v_member from public.members where id = p_member_id for update;
  if not found or v_member.status <> 'active' then
    raise exception 'Anggota tidak ditemukan atau tidak aktif';
  end if;

  for v_book_id in
    select selected.book_id
    from unnest(p_book_ids) as selected(book_id)
    order by selected.book_id
  loop
    select * into v_book from public.books where id = v_book_id for update;
    if not found or v_book.available_stock < 1 then
      raise exception 'Salah satu buku tidak tersedia';
    end if;
  end loop;

  insert into public.transactions (
    transaction_id, member_id, member_name, member_number, borrowing_date, due_date
  ) values (
    'TRX-' || to_char(current_date, 'YYYY') || '-' ||
      lpad(nextval('public.transaction_code_seq')::text, 6, '0'),
    v_member.id,
    v_member.full_name,
    v_member.member_number,
    p_borrowing_date,
    p_due_date
  ) returning id into v_transaction_id;

  for v_book_id in
    select selected.book_id
    from unnest(p_book_ids) as selected(book_id)
    order by selected.book_id
  loop
    insert into public.transaction_books (transaction_id, book_id, title, book_code, cover_image)
    select v_transaction_id, id, title, book_code, cover_image
    from public.books where id = v_book_id;

    update public.books
    set available_stock = available_stock - 1
    where id = v_book_id;
  end loop;

  update public.members
  set active_loans = active_loans + cardinality(p_book_ids),
      total_borrowed = total_borrowed + cardinality(p_book_ids)
  where id = v_member.id;

  return v_transaction_id;
end;
$$;

create or replace function public.return_borrowing(
  p_transaction_id uuid,
  p_return_date date,
  p_fine numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction public.transactions%rowtype;
  v_book record;
  v_book_count integer := 0;
begin
  if not public.has_staff_access() then
    raise exception 'Hanya admin atau pustakawan yang dapat memproses pengembalian';
  end if;

  select * into v_transaction
  from public.transactions
  where id = p_transaction_id
  for update;

  if not found or v_transaction.status not in ('active', 'overdue', 'extended') then
    raise exception 'Transaksi tidak ditemukan atau sudah dikembalikan';
  end if;

  for v_book in
    select book_id from public.transaction_books where transaction_id = p_transaction_id
  loop
    update public.books
    set available_stock = available_stock + 1
    where id = v_book.book_id;
    v_book_count := v_book_count + 1;
  end loop;

  update public.members
  set active_loans = greatest(0, active_loans - v_book_count)
  where id = v_transaction.member_id;

  update public.transactions
  set status = 'returned', return_date = p_return_date, fine = p_fine
  where id = p_transaction_id;
end;
$$;

create index members_user_id_idx on public.members(user_id);
create index transactions_member_id_idx on public.transactions(member_id);
create index transaction_books_book_id_idx on public.transaction_books(book_id);

revoke all on function public.is_approved_user() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.has_staff_access() from public, anon;
revoke all on function public.owns_member(uuid) from public, anon;
revoke all on function public.owns_transaction(uuid) from public, anon;
revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke all on function public.create_member_for_profile() from public, anon, authenticated;
revoke all on function public.sync_member_approval_status() from public, anon, authenticated;
revoke all on function public.create_borrowing(uuid, uuid[], date, date) from public, anon;
revoke all on function public.return_borrowing(uuid, date, numeric) from public, anon;

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.members enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_books enable row level security;

create policy "Profiles are visible to their owner or admins"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "Only admins can update profiles"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Approved users can read books"
  on public.books for select to authenticated
  using (public.is_approved_user());
create policy "Staff can insert books"
  on public.books for insert to authenticated
  with check (public.has_staff_access());
create policy "Staff can update books"
  on public.books for update to authenticated
  using (public.has_staff_access()) with check (public.has_staff_access());
create policy "Staff can delete books"
  on public.books for delete to authenticated
  using (public.has_staff_access());

create policy "Staff and owners can read members"
  on public.members for select to authenticated
  using (public.has_staff_access() or user_id = (select auth.uid()));
create policy "Staff can insert members"
  on public.members for insert to authenticated
  with check (public.has_staff_access());
create policy "Staff can update members"
  on public.members for update to authenticated
  using (public.has_staff_access()) with check (public.has_staff_access());
create policy "Staff can delete members"
  on public.members for delete to authenticated
  using (public.has_staff_access());

create policy "Staff and owners can read transactions"
  on public.transactions for select to authenticated
  using (public.has_staff_access() or public.owns_member(member_id));
create policy "Staff can update transactions"
  on public.transactions for update to authenticated
  using (public.has_staff_access()) with check (public.has_staff_access());

create policy "Staff and owners can read borrowed books"
  on public.transaction_books for select to authenticated
  using (public.has_staff_access() or public.owns_transaction(transaction_id));

grant usage on schema public to authenticated;
grant usage, select on sequence public.member_number_seq to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.books to authenticated;
grant select, insert, update, delete on public.members to authenticated;
grant select, update on public.transactions to authenticated;
grant select on public.transaction_books to authenticated;
grant execute on function public.is_approved_user() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_staff_access() to authenticated;
grant execute on function public.owns_member(uuid) to authenticated;
grant execute on function public.owns_transaction(uuid) to authenticated;
grant execute on function public.create_borrowing(uuid, uuid[], date, date) to authenticated;
grant execute on function public.return_borrowing(uuid, date, numeric) to authenticated;

-- Additive feature schema for projects that already ran schema.sql.
-- Run this once in the existing Supabase project's SQL Editor.

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  reservation_date date not null default current_date,
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'fulfilled', 'cancelled')),
  queue_position integer,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  member_name text not null default '',
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (book_id, member_id)
);

alter table public.reviews
  add column if not exists member_name text not null default '';

create table if not exists public.wishlists (
  member_id uuid not null references public.members(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, book_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (
    type in ('due_date', 'overdue', 'reservation', 'borrowing', 'return', 'announcement')
  ),
  title text not null,
  message text not null,
  link text,
  reference_id uuid,
  event_date date,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.fines (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  fine_amount numeric(12, 2) not null check (fine_amount >= 0),
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'waived')),
  issued_date date not null default current_date,
  paid_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.procurements (
  id uuid primary key default gen_random_uuid(),
  book_title text not null,
  author text not null,
  source text not null check (source in ('purchase', 'donation', 'exchange')),
  quantity integer not null check (quantity > 0),
  acquisition_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'received', 'processed')),
  cost numeric(12, 2) check (cost is null or cost >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.library_settings (
  singleton boolean primary key default true check (singleton),
  library_name text not null default 'Perpustakaan',
  library_address text not null default '',
  library_phone text not null default '',
  library_email text not null default '',
  max_borrow_days integer not null default 14 check (max_borrow_days > 0),
  max_books_per_member integer not null default 3 check (max_books_per_member > 0),
  fine_per_day numeric(12, 2) not null default 1000 check (fine_per_day >= 0),
  max_fine numeric(12, 2) not null default 50000 check (max_fine >= 0),
  automatic_fines boolean not null default true,
  allow_extensions boolean not null default true,
  max_extensions integer not null default 1 check (max_extensions >= 0),
  notification_preferences jsonb not null default
    '{"emailDueReminder":true,"emailOverdue":true,"emailBorrowing":true,"emailReturn":true,"appAnnouncement":true,"appReservation":true,"appNewBooks":false}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.library_settings
  add column if not exists max_fine numeric(12, 2) not null default 50000 check (max_fine >= 0),
  add column if not exists automatic_fines boolean not null default true,
  add column if not exists notification_preferences jsonb not null default
    '{"emailDueReminder":true,"emailOverdue":true,"emailBorrowing":true,"emailReturn":true,"appAnnouncement":true,"appReservation":true,"appNewBooks":false}'::jsonb;

create table if not exists public.reading_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  current_page integer not null default 1 check (current_page > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create index if not exists reservations_book_status_idx
  on public.reservations(book_id, status, created_at);
create index if not exists reviews_book_created_idx
  on public.reviews(book_id, created_at desc);
create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create unique index if not exists notifications_event_unique_idx
  on public.notifications(user_id, type, reference_id, event_date)
  where reference_id is not null;
create index if not exists fines_member_status_idx
  on public.fines(member_id, status);
create index if not exists procurements_created_idx
  on public.procurements(created_at desc);

insert into public.library_settings (singleton)
values (true)
on conflict (singleton) do nothing;

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
  v_book public.books%rowtype;
  v_book_id uuid;
  v_settings public.library_settings%rowtype;
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
  if p_borrowing_date is null or p_due_date <= p_borrowing_date then
    raise exception 'Tanggal jatuh tempo harus setelah tanggal peminjaman';
  end if;

  select * into v_settings from public.library_settings where singleton = true;
  if not found then raise exception 'Pengaturan perpustakaan belum tersedia'; end if;
  if p_due_date > p_borrowing_date + v_settings.max_borrow_days then
    raise exception 'Jatuh tempo melebihi batas peminjaman perpustakaan';
  end if;

  select * into v_member from public.members where id = p_member_id for update;
  if not found or v_member.status <> 'active' then
    raise exception 'Anggota tidak ditemukan atau tidak aktif';
  end if;
  if v_member.active_loans + cardinality(p_book_ids) > v_settings.max_books_per_member then
    raise exception 'Anggota sudah mencapai batas jumlah buku pinjaman';
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
    v_member.id, v_member.full_name, v_member.member_number,
    p_borrowing_date, p_due_date
  ) returning id into v_transaction_id;

  for v_book_id in
    select selected.book_id
    from unnest(p_book_ids) as selected(book_id)
    order by selected.book_id
  loop
    insert into public.transaction_books (transaction_id, book_id, title, book_code, cover_image)
    select v_transaction_id, id, title, book_code, cover_image
    from public.books where id = v_book_id;

    update public.books set available_stock = available_stock - 1 where id = v_book_id;
  end loop;

  update public.members
  set active_loans = active_loans + cardinality(p_book_ids),
      total_borrowed = total_borrowed + cardinality(p_book_ids)
  where id = v_member.id;

  return v_transaction_id;
end;
$$;

create or replace function public.mark_all_my_notifications_read()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = (select auth.uid()) and read_at is null;
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
  v_settings public.library_settings%rowtype;
  v_fine numeric(12, 2) := 0;
begin
  if not public.has_staff_access() then
    raise exception 'Hanya admin atau pustakawan yang dapat memproses pengembalian';
  end if;
  if p_return_date is null or p_return_date > current_date then
    raise exception 'Tanggal pengembalian tidak valid';
  end if;

  select * into v_transaction
  from public.transactions
  where id = p_transaction_id
  for update;
  if not found or v_transaction.status not in ('active', 'overdue', 'extended') then
    raise exception 'Transaksi tidak ditemukan atau sudah dikembalikan';
  end if;

  select * into v_settings from public.library_settings where singleton = true;
  if not found then raise exception 'Pengaturan denda belum tersedia'; end if;
  if v_settings.automatic_fines then
    v_fine := least(
      greatest(0, p_return_date - v_transaction.due_date) * v_settings.fine_per_day,
      v_settings.max_fine
    );
  end if;

  for v_book in
    select tb.book_id from public.transaction_books tb
    where tb.transaction_id = p_transaction_id
    order by tb.book_id
  loop
    update public.books set available_stock = available_stock + 1 where id = v_book.book_id;
    v_book_count := v_book_count + 1;
  end loop;

  update public.members
  set active_loans = greatest(0, active_loans - v_book_count)
  where id = v_transaction.member_id;

  update public.transactions
  set status = 'returned', return_date = p_return_date, fine = v_fine
  where id = p_transaction_id;
end;
$$;

create or replace function public.update_book_rating_summary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_book_id uuid;
begin
  v_book_id := coalesce(new.book_id, old.book_id);
  update public.books
  set rating = coalesce((select avg(r.rating)::numeric(3, 2) from public.reviews r where r.book_id = v_book_id), 0),
      review_count = (select count(*)::integer from public.reviews r where r.book_id = v_book_id)
  where id = v_book_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.set_review_member_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select m.full_name into new.member_name
  from public.members m where m.id = new.member_id;
  if new.member_name is null then raise exception 'Anggota tidak ditemukan'; end if;
  return new;
end;
$$;

drop trigger if exists reviews_set_member_name on public.reviews;
create trigger reviews_set_member_name
  before insert or update of member_id on public.reviews
  for each row execute procedure public.set_review_member_name();

drop trigger if exists reviews_update_book_rating on public.reviews;
create trigger reviews_update_book_rating
  after insert or update or delete on public.reviews
  for each row execute procedure public.update_book_rating_summary();

create or replace function public.sync_profile_member_details()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.members
  set full_name = new.full_name,
      email = new.email,
      phone = new.phone,
      category = new.member_category,
      class_or_department = new.class_or_department
  where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists profile_sync_member_details on public.profiles;
create trigger profile_sync_member_details
  after update of full_name, email, phone, member_category, class_or_department
  on public.profiles
  for each row execute procedure public.sync_profile_member_details();

create or replace function public.notify_borrowing_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_book_titles text;
begin
  select m.user_id into v_user_id
  from public.members m where m.id = new.member_id;
  if v_user_id is null then return new; end if;

  select string_agg(tb.title, ', ' order by tb.title) into v_book_titles
  from public.transaction_books tb where tb.transaction_id = new.id;

  insert into public.notifications (user_id, type, title, message, link, reference_id, event_date)
  values (
    v_user_id, 'borrowing', 'Peminjaman dicatat',
    'Peminjaman ' || coalesce(v_book_titles, 'buku') || ' tercatat. Jatuh tempo ' || new.due_date || '.',
    '/borrowing', new.id, new.borrowing_date
  )
  on conflict (user_id, type, reference_id, event_date)
    where reference_id is not null do nothing;
  return new;
end;
$$;

drop trigger if exists transaction_notify_borrowing on public.transactions;
create trigger transaction_notify_borrowing
  after insert on public.transactions
  for each row execute procedure public.notify_borrowing_events();

create or replace function public.process_return_side_effects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_book record;
  v_next_reservation public.reservations%rowtype;
  v_book_titles text;
begin
  if new.status <> 'returned' or old.status = 'returned' then return new; end if;

  select m.user_id into v_user_id
  from public.members m where m.id = new.member_id;

  select string_agg(tb.title, ', ' order by tb.title) into v_book_titles
  from public.transaction_books tb where tb.transaction_id = new.id;

  if v_user_id is not null then
    insert into public.notifications (user_id, type, title, message, link, reference_id, event_date)
    values (
      v_user_id, 'return', 'Pengembalian berhasil',
      'Pengembalian ' || coalesce(v_book_titles, 'buku') || ' telah dicatat.',
      '/returns', new.id, new.return_date
    )
    on conflict (user_id, type, reference_id, event_date)
      where reference_id is not null do nothing;
  end if;

  if coalesce(new.fine, 0) > 0 then
    insert into public.fines (transaction_id, member_id, fine_amount, issued_date)
    values (new.id, new.member_id, new.fine, new.return_date)
    on conflict (transaction_id) do update
      set fine_amount = excluded.fine_amount, updated_at = now();
  end if;

  for v_book in
    select tb.book_id, tb.title
    from public.transaction_books tb
    where tb.transaction_id = new.id
  loop
    select r.* into v_next_reservation
    from public.reservations r
    where r.book_id = v_book.book_id and r.status = 'pending'
    order by r.created_at, r.id
    limit 1
    for update;

    if found then
      update public.reservations
      set status = 'ready', queue_position = null
      where id = v_next_reservation.id;

      select m.user_id into v_user_id
      from public.members m where m.id = v_next_reservation.member_id;
      if v_user_id is not null then
        insert into public.notifications (user_id, type, title, message, link, reference_id, event_date)
        values (
          v_user_id, 'reservation', 'Reservasi siap diambil',
          'Buku ' || v_book.title || ' yang Anda reservasi sudah tersedia.',
          '/reservations', v_next_reservation.id, current_date
        )
        on conflict (user_id, type, reference_id, event_date)
          where reference_id is not null do nothing;
      end if;

      with ordered as (
        select r.id, row_number() over (order by r.created_at, r.id)::integer as position
        from public.reservations r
        where r.book_id = v_book.book_id and r.status = 'pending'
      )
      update public.reservations r
      set queue_position = ordered.position
      from ordered
      where r.id = ordered.id;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists transaction_process_return_side_effects on public.transactions;
create trigger transaction_process_return_side_effects
  after update of status on public.transactions
  for each row execute procedure public.process_return_side_effects();

create or replace function public.create_reservation(p_book_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
  v_book public.books%rowtype;
  v_reservation_id uuid;
  v_position integer;
begin
  if not public.is_approved_user() then
    raise exception 'Akun belum disetujui';
  end if;

  select * into v_member
  from public.members
  where user_id = (select auth.uid())
  for update;
  if not found or v_member.status <> 'active' then
    raise exception 'Keanggotaan tidak aktif';
  end if;

  select * into v_book from public.books where id = p_book_id for update;
  if not found then raise exception 'Buku tidak ditemukan'; end if;
  if v_book.available_stock > 0 then raise exception 'Buku masih tersedia dan dapat dipinjam'; end if;
  if exists (
    select 1 from public.reservations r
    where r.book_id = p_book_id and r.member_id = v_member.id
      and r.status in ('pending', 'ready')
  ) then raise exception 'Anda sudah memiliki reservasi aktif untuk buku ini'; end if;

  select count(*)::integer + 1 into v_position
  from public.reservations r
  where r.book_id = p_book_id and r.status = 'pending';

  insert into public.reservations (member_id, book_id, queue_position)
  values (v_member.id, p_book_id, v_position)
  returning id into v_reservation_id;

  insert into public.notifications (user_id, type, title, message, link, reference_id, event_date)
  values (
    (select auth.uid()), 'reservation', 'Reservasi dibuat',
    'Anda berada di antrean nomor ' || v_position || ' untuk ' || v_book.title || '.',
    '/reservations', v_reservation_id, current_date
  );

  return v_reservation_id;
end;
$$;

create or replace function public.cancel_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations%rowtype;
begin
  select r.* into v_reservation
  from public.reservations r
  join public.members m on m.id = r.member_id
  where r.id = p_reservation_id
    and (m.user_id = (select auth.uid()) or public.has_staff_access())
  for update of r;
  if not found then raise exception 'Reservasi tidak ditemukan'; end if;
  if v_reservation.status not in ('pending', 'ready') then
    raise exception 'Reservasi ini tidak dapat dibatalkan';
  end if;

  update public.reservations set status = 'cancelled', queue_position = null
  where id = p_reservation_id;

  with ordered as (
    select r.id, row_number() over (order by r.created_at, r.id)::integer as position
    from public.reservations r
    where r.book_id = v_reservation.book_id and r.status = 'pending'
  )
  update public.reservations r
  set queue_position = ordered.position
  from ordered
  where r.id = ordered.id;
end;
$$;

create or replace function public.set_reservation_status(
  p_reservation_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations%rowtype;
  v_user_id uuid;
  v_book_title text;
  v_settings public.library_settings%rowtype;
begin
  if not public.has_staff_access() then raise exception 'Akses pustakawan diperlukan'; end if;
  if p_status not in ('ready', 'fulfilled', 'cancelled') then raise exception 'Status tidak valid'; end if;

  select r.* into v_reservation
  from public.reservations r where r.id = p_reservation_id for update;
  if not found then raise exception 'Reservasi tidak ditemukan'; end if;
  if v_reservation.status not in ('pending', 'ready') then
    raise exception 'Reservasi sudah selesai atau dibatalkan';
  end if;
  if p_status = 'ready' and v_reservation.status = 'pending'
     and (select b.available_stock from public.books b where b.id = v_reservation.book_id) < 1 then
    raise exception 'Buku belum tersedia untuk diambil';
  end if;
  if p_status = 'fulfilled' and v_reservation.status <> 'ready' then
    raise exception 'Reservasi harus berstatus siap sebelum diselesaikan';
  end if;
  if p_status = 'fulfilled' then
    select * into v_settings from public.library_settings where singleton = true;
    perform public.create_borrowing(
      v_reservation.member_id,
      array[v_reservation.book_id],
      current_date,
      current_date + v_settings.max_borrow_days
    );
  end if;

  update public.reservations
  set status = p_status,
      queue_position = case when p_status = 'pending' then queue_position else null end
  where id = p_reservation_id;

  if p_status = 'ready' then
    select m.user_id, b.title into v_user_id, v_book_title
    from public.members m cross join public.books b
    where m.id = v_reservation.member_id and b.id = v_reservation.book_id;
    if v_user_id is not null then
      insert into public.notifications (user_id, type, title, message, link, reference_id, event_date)
      values (
        v_user_id, 'reservation', 'Reservasi siap diambil',
        'Buku ' || v_book_title || ' yang Anda reservasi sudah tersedia.',
        '/reservations', p_reservation_id, current_date
      )
      on conflict (user_id, type, reference_id, event_date)
        where reference_id is not null do nothing;
    end if;
  end if;

  with ordered as (
    select r.id, row_number() over (order by r.created_at, r.id)::integer as position
    from public.reservations r
    where r.book_id = v_reservation.book_id and r.status = 'pending'
  )
  update public.reservations r
  set queue_position = ordered.position
  from ordered
  where r.id = ordered.id;
end;
$$;

create or replace function public.extend_borrowing(p_transaction_id uuid)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction public.transactions%rowtype;
  v_settings public.library_settings%rowtype;
  v_user_id uuid;
  v_extended_days integer;
  v_new_due_date date;
begin
  if not public.has_staff_access() then raise exception 'Akses pustakawan diperlukan'; end if;

  select * into v_settings from public.library_settings where singleton = true;
  if not found or not v_settings.allow_extensions then
    raise exception 'Perpanjangan sedang tidak diizinkan';
  end if;

  select * into v_transaction
  from public.transactions where id = p_transaction_id for update;
  if not found or v_transaction.status not in ('active', 'extended') then
    raise exception 'Peminjaman tidak dapat diperpanjang';
  end if;
  if v_transaction.due_date < current_date then raise exception 'Peminjaman yang terlambat tidak dapat diperpanjang'; end if;

  v_extended_days := coalesce(v_transaction.extended_days, 0);
  if v_extended_days / 7 >= v_settings.max_extensions then
    raise exception 'Batas perpanjangan sudah tercapai';
  end if;

  if exists (
    select 1
    from public.transaction_books tb
    join public.reservations r on r.book_id = tb.book_id and r.status in ('pending', 'ready')
    where tb.transaction_id = p_transaction_id
  ) then raise exception 'Buku ini sedang direservasi anggota lain'; end if;

  v_new_due_date := v_transaction.due_date + 7;
  update public.transactions
  set due_date = v_new_due_date, status = 'extended', extended_days = v_extended_days + 7
  where id = p_transaction_id;

  select m.user_id into v_user_id from public.members m where m.id = v_transaction.member_id;
  if v_user_id is not null then
    insert into public.notifications (user_id, type, title, message, link, reference_id, event_date)
    values (
      v_user_id, 'due_date', 'Peminjaman diperpanjang',
      'Jatuh tempo baru adalah ' || v_new_due_date || '.',
      '/borrowing', p_transaction_id, v_new_due_date
    )
    on conflict (user_id, type, reference_id, event_date)
      where reference_id is not null do nothing;
  end if;

  return v_new_due_date;
end;
$$;

create or replace function public.refresh_my_due_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_approved_user() then raise exception 'Akun belum disetujui'; end if;

  insert into public.notifications (user_id, type, title, message, link, reference_id, event_date)
  select
    (select auth.uid()),
    case when t.due_date < current_date then 'overdue' else 'due_date' end,
    case when t.due_date < current_date then 'Peminjaman terlambat' else 'Pengingat jatuh tempo' end,
    'Jatuh tempo ' || t.due_date || ': ' ||
      coalesce(string_agg(tb.title, ', ' order by tb.title), 'buku pinjaman') || '.',
    '/borrowing',
    t.id,
    t.due_date
  from public.transactions t
  join public.members m on m.id = t.member_id
  left join public.transaction_books tb on tb.transaction_id = t.id
  where m.user_id = (select auth.uid())
    and t.status in ('active', 'extended', 'overdue')
    and t.due_date <= current_date + 2
  group by t.id
  on conflict (user_id, type, reference_id, event_date)
    where reference_id is not null do nothing;
end;
$$;

create or replace function public.mark_my_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and user_id = (select auth.uid());
  if not found then raise exception 'Notifikasi tidak ditemukan'; end if;
end;
$$;

create or replace function public.save_my_reading_progress(p_book_id uuid, p_current_page integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_approved_user() then raise exception 'Akun belum disetujui'; end if;
  if p_current_page < 1 then raise exception 'Halaman harus minimal 1'; end if;
  if not exists (
    select 1 from public.books b
    where b.id = p_book_id and b.is_digital and b.digital_file_url is not null
  ) then raise exception 'E-book tidak ditemukan atau belum memiliki file'; end if;

  insert into public.reading_progress (user_id, book_id, current_page, updated_at)
  values ((select auth.uid()), p_book_id, p_current_page, now())
  on conflict (user_id, book_id) do update
    set current_page = excluded.current_page, updated_at = excluded.updated_at;
end;
$$;

create or replace function public.update_my_profile(
  p_full_name text,
  p_phone text,
  p_class_or_department text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(trim(p_full_name)) < 2 then raise exception 'Nama minimal 2 karakter'; end if;
  update public.profiles
  set full_name = trim(p_full_name),
      phone = trim(p_phone),
      class_or_department = trim(p_class_or_department)
  where id = (select auth.uid());
  if not found then raise exception 'Profil tidak ditemukan'; end if;
end;
$$;

create or replace function public.update_member_details(
  p_member_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_class_or_department text,
  p_category public.member_category,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
begin
  if not public.has_staff_access() then raise exception 'Akses pustakawan diperlukan'; end if;
  if length(trim(p_full_name)) < 2 or trim(p_class_or_department) = '' or
     trim(p_phone) = '' or trim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Data anggota tidak valid';
  end if;
  if p_status not in ('active', 'inactive', 'suspended') then
    raise exception 'Status keanggotaan tidak valid';
  end if;

  select * into v_member from public.members where id = p_member_id for update;
  if not found then raise exception 'Anggota tidak ditemukan'; end if;

  if v_member.user_id is not null then
    update public.profiles
    set full_name = trim(p_full_name),
        phone = trim(p_phone),
        class_or_department = trim(p_class_or_department),
        role = case
          when role::text in ('student', 'teacher', 'staff') then p_category::text::public.app_role
          else role
        end,
        member_category = p_category
    where id = v_member.user_id;
    if not found then raise exception 'Profil akun anggota tidak ditemukan'; end if;
  else
    update public.members
    set full_name = trim(p_full_name),
        email = trim(p_email),
        phone = trim(p_phone),
        class_or_department = trim(p_class_or_department),
        category = p_category
    where id = p_member_id;
  end if;
  update public.members set status = p_status where id = p_member_id;
end;
$$;

create or replace function public.set_fine_status(p_fine_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_staff_access() then raise exception 'Akses pustakawan diperlukan'; end if;
  if p_status not in ('paid', 'waived') then raise exception 'Status denda tidak valid'; end if;
  update public.fines
  set status = p_status,
      paid_date = case when p_status = 'paid' then current_date else null end,
      updated_at = now()
  where id = p_fine_id and status = 'unpaid';
  if not found then raise exception 'Denda tidak ditemukan atau sudah diproses'; end if;
end;
$$;

create or replace function public.notify_fine_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_transaction_id text;
begin
  if new.status = old.status then return new; end if;
  select m.user_id into v_user_id from public.members m where m.id = new.member_id;
  select t.transaction_id into v_transaction_id from public.transactions t where t.id = new.transaction_id;
  if v_user_id is not null then
    insert into public.notifications (user_id, type, title, message, link, reference_id, event_date)
    values (
      v_user_id, 'return',
      case when new.status = 'paid' then 'Denda dibayar' else 'Denda dihapus' end,
      'Status denda transaksi ' || coalesce(v_transaction_id, '') || ' diperbarui.',
      '/fines', new.id, current_date
    )
    on conflict (user_id, type, reference_id, event_date)
      where reference_id is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists fine_notify_status_change on public.fines;
create trigger fine_notify_status_change
  after update of status on public.fines
  for each row execute procedure public.notify_fine_status_change();

alter table public.reservations enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlists enable row level security;
alter table public.notifications enable row level security;
alter table public.fines enable row level security;
alter table public.procurements enable row level security;
alter table public.library_settings enable row level security;
alter table public.reading_progress enable row level security;

drop policy if exists "Staff and owners can read reservations" on public.reservations;
create policy "Staff and owners can read reservations"
  on public.reservations for select to authenticated
  using (public.has_staff_access() or public.owns_member(member_id));

drop policy if exists "Approved users can read reviews" on public.reviews;
create policy "Approved users can read reviews"
  on public.reviews for select to authenticated
  using (public.is_approved_user());
drop policy if exists "Members can create their own reviews" on public.reviews;
create policy "Members can create their own reviews"
  on public.reviews for insert to authenticated
  with check (
    public.is_approved_user()
    and exists (select 1 from public.members m where m.id = member_id and m.user_id = (select auth.uid()))
  );
drop policy if exists "Owners and staff can update reviews" on public.reviews;
create policy "Owners and staff can update reviews"
  on public.reviews for update to authenticated
  using (
    public.has_staff_access()
    or exists (select 1 from public.members m where m.id = member_id and m.user_id = (select auth.uid()))
  )
  with check (
    public.has_staff_access()
    or exists (select 1 from public.members m where m.id = member_id and m.user_id = (select auth.uid()))
  );
drop policy if exists "Owners and staff can delete reviews" on public.reviews;
create policy "Owners and staff can delete reviews"
  on public.reviews for delete to authenticated
  using (
    public.has_staff_access()
    or exists (select 1 from public.members m where m.id = member_id and m.user_id = (select auth.uid()))
  );

drop policy if exists "Owners and staff can read wishlists" on public.wishlists;
create policy "Owners and staff can read wishlists"
  on public.wishlists for select to authenticated
  using (public.has_staff_access() or public.owns_member(member_id));
drop policy if exists "Members can add to their wishlist" on public.wishlists;
create policy "Members can add to their wishlist"
  on public.wishlists for insert to authenticated
  with check (
    public.is_approved_user()
    and exists (select 1 from public.members m where m.id = member_id and m.user_id = (select auth.uid()))
  );
drop policy if exists "Members can remove from their wishlist" on public.wishlists;
create policy "Members can remove from their wishlist"
  on public.wishlists for delete to authenticated
  using (public.owns_member(member_id));

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or public.has_staff_access());

drop policy if exists "Staff and owners can read fines" on public.fines;
create policy "Staff and owners can read fines"
  on public.fines for select to authenticated
  using (public.has_staff_access() or public.owns_member(member_id));

drop policy if exists "Staff can manage procurements" on public.procurements;
create policy "Staff can manage procurements"
  on public.procurements for all to authenticated
  using (public.has_staff_access()) with check (public.has_staff_access());

drop policy if exists "Staff can read settings" on public.library_settings;
create policy "Staff can read settings"
  on public.library_settings for select to authenticated
  using (public.has_staff_access());
drop policy if exists "Admins can update settings" on public.library_settings;
create policy "Admins can update settings"
  on public.library_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users can read own reading progress" on public.reading_progress;
create policy "Users can read own reading progress"
  on public.reading_progress for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on function public.update_book_rating_summary() from public, anon, authenticated;
revoke all on function public.set_review_member_name() from public, anon, authenticated;
revoke all on function public.sync_profile_member_details() from public, anon, authenticated;
revoke all on function public.notify_borrowing_events() from public, anon, authenticated;
revoke all on function public.process_return_side_effects() from public, anon, authenticated;
revoke all on function public.notify_fine_status_change() from public, anon, authenticated;
revoke all on function public.create_reservation(uuid) from public, anon;
revoke all on function public.cancel_reservation(uuid) from public, anon;
revoke all on function public.set_reservation_status(uuid, text) from public, anon;
revoke all on function public.extend_borrowing(uuid) from public, anon;
revoke all on function public.refresh_my_due_notifications() from public, anon;
revoke all on function public.mark_my_notification_read(uuid) from public, anon;
revoke all on function public.mark_all_my_notifications_read() from public, anon;
revoke all on function public.save_my_reading_progress(uuid, integer) from public, anon;
revoke all on function public.update_my_profile(text, text, text) from public, anon;
revoke all on function public.update_member_details(uuid, text, text, text, text, public.member_category, text) from public, anon;
revoke all on function public.set_fine_status(uuid, text) from public, anon;

grant select on public.reservations, public.reviews, public.wishlists, public.notifications,
  public.fines, public.procurements, public.library_settings, public.reading_progress
  to authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant insert, delete on public.wishlists to authenticated;
grant insert, update, delete on public.procurements to authenticated;
grant update on public.library_settings to authenticated;
revoke update on public.transactions from authenticated;

grant execute on function public.create_reservation(uuid) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
grant execute on function public.set_reservation_status(uuid, text) to authenticated;
grant execute on function public.extend_borrowing(uuid) to authenticated;
grant execute on function public.refresh_my_due_notifications() to authenticated;
grant execute on function public.mark_my_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_my_notifications_read() to authenticated;
grant execute on function public.save_my_reading_progress(uuid, integer) to authenticated;
grant execute on function public.update_my_profile(text, text, text) to authenticated;
grant execute on function public.update_member_details(uuid, text, text, text, text, public.member_category, text) to authenticated;
grant execute on function public.set_fine_status(uuid, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ebooks', 'ebooks', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "Approved users can read ebook files" on storage.objects;
create policy "Approved users can read ebook files"
  on storage.objects for select to authenticated
  using (bucket_id = 'ebooks' and public.is_approved_user());
drop policy if exists "Staff can upload ebook files" on storage.objects;
create policy "Staff can upload ebook files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ebooks' and public.has_staff_access());
drop policy if exists "Staff can update ebook files" on storage.objects;
create policy "Staff can update ebook files"
  on storage.objects for update to authenticated
  using (bucket_id = 'ebooks' and public.has_staff_access())
  with check (bucket_id = 'ebooks' and public.has_staff_access());
drop policy if exists "Staff can delete ebook files" on storage.objects;
create policy "Staff can delete ebook files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ebooks' and public.has_staff_access());

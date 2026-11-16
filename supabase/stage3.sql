-- Additive upgrade for existing Stage 2 databases.
-- Run after stage2.sql in the existing Supabase project's SQL Editor.

alter table public.procurements
  add column if not exists book_id uuid references public.books(id) on delete set null,
  add column if not exists stock_received boolean not null default false;

revoke insert, update on public.procurements from authenticated;
grant insert (book_title, author, source, quantity, acquisition_date, cost, created_by)
  on public.procurements to authenticated;
grant update (book_title, author, source, quantity, acquisition_date, cost)
  on public.procurements to authenticated;

create or replace function public.receive_procurement(
  p_procurement_id uuid,
  p_book_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_procurement public.procurements%rowtype;
  v_book public.books%rowtype;
begin
  if not public.has_staff_access() then
    raise exception 'Akses pustakawan diperlukan';
  end if;

  select * into v_procurement
  from public.procurements
  where id = p_procurement_id
  for update;
  if not found then raise exception 'Catatan pengadaan tidak ditemukan'; end if;
  if v_procurement.stock_received then
    raise exception 'Pengadaan ini sudah ditambahkan ke stok';
  end if;

  if p_book_id is null then
    insert into public.books (
      title, author, book_code, total_stock, available_stock
    )
    values (
      v_procurement.book_title,
      v_procurement.author,
      'PENG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
      v_procurement.quantity,
      v_procurement.quantity
    )
    returning * into v_book;
  else
    select * into v_book
    from public.books
    where id = p_book_id and not is_digital
    for update;
    if not found then raise exception 'Buku tujuan stok tidak ditemukan'; end if;

    update public.books
    set total_stock = total_stock + v_procurement.quantity,
        available_stock = available_stock + v_procurement.quantity
    where id = p_book_id
    returning * into v_book;
  end if;

  update public.procurements
  set book_id = v_book.id,
      stock_received = true,
      status = 'received'
  where id = p_procurement_id;

  return v_book.id;
end;
$$;

revoke all on function public.receive_procurement(uuid, uuid) from public, anon;
grant execute on function public.receive_procurement(uuid, uuid) to authenticated;

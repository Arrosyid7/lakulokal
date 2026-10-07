alter table public.orders
  add column if not exists order_code text;

alter table public.orders
  add column if not exists youtube_url text;

update public.orders
set order_code = 'LL-LEGACY-' || upper(id::text)
where order_code is null or btrim(order_code) = '';

create unique index if not exists orders_order_code_key
  on public.orders (order_code);

alter table public.orders
  alter column order_code set not null;

notify pgrst, 'reload schema';

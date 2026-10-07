alter table public.orders
  add column if not exists dana_checkout_url text;

alter table public.payments
  add column if not exists checkout_url text;

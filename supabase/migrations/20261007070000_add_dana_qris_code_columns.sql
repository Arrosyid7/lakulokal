alter table public.orders
  add column if not exists dana_qr_content text;

alter table public.payments
  add column if not exists qr_content text;

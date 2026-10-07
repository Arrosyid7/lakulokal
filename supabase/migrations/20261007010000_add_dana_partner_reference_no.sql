alter table public.orders
  add column if not exists dana_partner_reference_no text;

notify pgrst, 'reload schema';

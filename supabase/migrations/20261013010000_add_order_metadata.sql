alter table public.orders
  add column if not exists metadata jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';

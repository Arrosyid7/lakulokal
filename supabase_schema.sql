-- Supabase schema untuk proyek YouTube Clipper
-- Gunakan di Supabase SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  url text not null,
  mode text not null check (mode in ('custom', 'ai')),
  status text not null default 'pending'
    check (status in ('pending','paid','processing','completed','failed','cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','pending','paid','failed','expired')),
  amount numeric(12,2) not null default 0,
  currency text not null default 'IDR',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued','processing','done','failed')),
  progress integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.clips (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  public_url text,
  size_mb numeric(10,2) not null default 0,
  duration_sec numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'doku',
  txn_id text,
  status text not null default 'pending',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'doku',
  event_name text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_jobs_order_id on public.jobs(order_id);
create index if not exists idx_jobs_status on public.jobs(status);
create index if not exists idx_clips_order_id on public.clips(order_id);
create index if not exists idx_payments_order_id on public.payments(order_id);
create index if not exists idx_webhook_events_provider on public.webhook_events(provider);

-- Optional: trigger otomatis update updated_at
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_touch_updated_at on public.orders;
create trigger trg_orders_touch_updated_at
before update on public.orders
for each row
execute function public.touch_updated_at();

-- RLS set-up example
-- enable row level security for tables
alter table public.users enable row level security;
alter table public.orders enable row level security;
alter table public.jobs enable row level security;
alter table public.clips enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_events enable row level security;

-- Example simple RLS policies for app-level access
-- NOTE: You should adjust this based on your auth design.

-- Drop existing policies first so the script can be rerun safely.
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Users can insert own orders" on public.orders;
drop policy if exists "Users can update own orders" on public.orders;
drop policy if exists "Users can see own jobs" on public.jobs;
drop policy if exists "Users can see own clips" on public.clips;
drop policy if exists "Allow service role full access" on public.users;
drop policy if exists "Allow service role full access orders" on public.orders;
drop policy if exists "Allow service role full access jobs" on public.jobs;
drop policy if exists "Allow service role full access clips" on public.clips;
drop policy if exists "Allow service role full access payments" on public.payments;
drop policy if exists "Allow service role full access webhook events" on public.webhook_events;

create policy "Users can view own profile"
  on public.users
  for select
  using (auth.uid() = id);

create policy "Users can view own orders"
  on public.orders
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own orders"
  on public.orders
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own orders"
  on public.orders
  for update
  using (auth.uid() = user_id);

create policy "Users can see own jobs"
  on public.jobs
  for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = jobs.order_id
        and o.user_id = auth.uid()
    )
  );

create policy "Users can see own clips"
  on public.clips
  for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = clips.order_id
        and o.user_id = auth.uid()
    )
  );

create policy "Allow service role full access"
  on public.users
  for all
  using (true)
  with check (true);

create policy "Allow service role full access orders"
  on public.orders
  for all
  using (true)
  with check (true);

create policy "Allow service role full access jobs"
  on public.jobs
  for all
  using (true)
  with check (true);

create policy "Allow service role full access clips"
  on public.clips
  for all
  using (true)
  with check (true);

create policy "Allow service role full access payments"
  on public.payments
  for all
  using (true)
  with check (true);

create policy "Allow service role full access webhook events"
  on public.webhook_events
  for all
  using (true)
  with check (true);

-- Storage bucket example
-- Run in Supabase Dashboard: Storage -> New bucket -> name: clips
-- This bucket should be public or use signed URLs depending on your product rules.
-- Example bucket policy (SQL for Storage can be configured in dashboard):
-- create policy "Public clips are viewable" on storage.objects for select using (bucket_id = 'clips');
-- create policy "Authenticated users can upload clips" on storage.objects for insert with check (bucket_id = 'clips' and auth.role() = 'authenticated');

-- Example mock data
-- insert into public.users (email, full_name) values ('demo@example.com', 'Demo User');
-- insert into public.orders (user_id, url, mode, status, payment_status, amount, metadata)
-- values ((select id from public.users where email='demo@example.com'), 'https://www.youtube.com/watch?v=example', 'custom', 'pending', 'pending', 25000, '{"segments": [{"start":"00:00","end":"00:30"}]}');

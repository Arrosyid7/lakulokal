-- LakuLokal production schema. Apply using the Supabase SQL editor or CLI.
-- All writes that affect payment or processing state must use a server-only service role.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('USER', 'ADMIN');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.processing_status as enum (
    'WAITING_PAYMENT', 'QUEUED', 'DOWNLOADING', 'PROCESSING',
    'UPLOADING', 'COMPLETED', 'FAILED'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  role public.user_role not null default 'USER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.packages (
  id text primary key,
  name text not null,
  clip_count integer not null check (clip_count > 0),
  price integer not null check (price >= 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.packages (id, name, clip_count, price, currency, active)
values ('five-clips', '5 Clip', 5, 1000, 'IDR', true)
on conflict (id) do update set
  name = excluded.name,
  clip_count = excluded.clip_count,
  price = excluded.price,
  currency = excluded.currency,
  active = excluded.active,
  updated_at = now();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  user_id uuid not null references public.profiles(id) on delete restrict,
  youtube_url text not null,
  package_id text not null references public.packages(id) on delete restrict,
  package_name text not null,
  clip_count integer not null check (clip_count > 0),
  amount integer not null check (amount >= 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  payment_status public.payment_status not null default 'PENDING',
  processing_status public.processing_status not null default 'WAITING_PAYMENT',
  dana_reference_no text,
  dana_partner_reference_no text,
  dana_qr_content text,
  dana_qr_url text,
  dana_qr_image text,
  dana_checkout_url text,
  payment_created_at timestamptz not null default now(),
  paid_at timestamptz,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  result_url text,
  result_zip_path text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null default 'DANA' check (provider = 'DANA'),
  provider_reference text not null unique,
  partner_reference text not null unique,
  amount integer not null check (amount >= 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  status public.payment_status not null default 'PENDING',
  qr_content text,
  qr_url text,
  qr_image text,
  checkout_url text,
  paid_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  cloud_run_execution text unique,
  status public.processing_status not null default 'QUEUED',
  progress smallint not null default 0 check (progress between 0 and 100),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.clips (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  clip_number smallint not null check (clip_number > 0),
  storage_path text not null unique,
  file_name text not null,
  content_type text not null default 'video/mp4',
  size_bytes bigint not null check (size_bytes >= 0),
  duration_seconds numeric(8, 2),
  created_at timestamptz not null default now(),
  unique (order_id, clip_number)
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  order_id uuid references public.orders(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique (provider, provider_event_id)
);

-- Upgrade fields from the previous application schema without deleting existing order history.
alter table public.profiles add column if not exists role public.user_role not null default 'USER';
alter table public.orders add column if not exists order_code text;
alter table public.orders add column if not exists youtube_url text;
alter table public.orders add column if not exists status text;
alter table public.orders add column if not exists package_id text;
alter table public.orders add column if not exists package_name text;
alter table public.orders add column if not exists clip_count integer;
alter table public.orders add column if not exists processing_status public.processing_status not null default 'WAITING_PAYMENT';
alter table public.orders add column if not exists dana_reference_no text;
alter table public.orders add column if not exists dana_partner_reference_no text;
alter table public.orders add column if not exists dana_qr_content text;
alter table public.orders add column if not exists dana_qr_url text;
alter table public.orders add column if not exists dana_qr_image text;
alter table public.orders add column if not exists dana_checkout_url text;
alter table public.orders add column if not exists payment_created_at timestamptz not null default now();
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists processing_started_at timestamptz;
alter table public.orders add column if not exists processing_completed_at timestamptz;
alter table public.orders add column if not exists result_url text;
alter table public.orders add column if not exists result_zip_path text;
alter table public.orders add column if not exists error_message text;
alter table public.orders add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists currency text not null default 'IDR';
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'url') then
    alter table public.orders alter column url drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'mode') then
    alter table public.orders alter column mode drop not null;
  end if;
end $$;
alter table public.payments add column if not exists provider_reference text;
alter table public.payments add column if not exists partner_reference text;
alter table public.payments add column if not exists payment_id text;
alter table public.payments add column if not exists txn_id text;
alter table public.payments add column if not exists amount integer;
alter table public.payments add column if not exists currency text not null default 'IDR';
alter table public.payments add column if not exists qr_content text;
alter table public.payments add column if not exists qr_url text;
alter table public.payments add column if not exists qr_image text;
alter table public.payments add column if not exists checkout_url text;
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists expires_at timestamptz;
notify pgrst, 'reload schema';
alter table public.webhook_events add column if not exists provider_event_id text;
alter table public.webhook_events add column if not exists event_type text;
alter table public.webhook_events add column if not exists event_name text;
alter table public.webhook_events add column if not exists order_id uuid references public.orders(id) on delete set null;
alter table public.webhook_events add column if not exists received_at timestamptz not null default now();
alter table public.webhook_events add column if not exists processing_error text;
alter table public.clips add column if not exists clip_number smallint;
alter table public.clips add column if not exists file_name text;
alter table public.clips add column if not exists content_type text not null default 'video/mp4';
alter table public.clips add column if not exists size_bytes bigint;
alter table public.clips add column if not exists duration_seconds numeric(8, 2);

update public.orders
set order_code = 'LL-LEGACY-' || upper(id::text)
where order_code is null or btrim(order_code) = '';
create unique index if not exists orders_order_code_key on public.orders (order_code);
alter table public.orders alter column order_code set not null;

alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders add constraint orders_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete restrict;

alter table public.orders drop constraint if exists orders_payment_status_check;
do $$ begin
  if (select udt_name from information_schema.columns
      where table_schema = 'public' and table_name = 'orders' and column_name = 'payment_status') <> 'payment_status' then
    alter table public.orders alter column payment_status drop default;
    alter table public.orders alter column payment_status type public.payment_status
      using case lower(payment_status::text)
        when 'paid' then 'PAID'::public.payment_status
        when 'failed' then 'FAILED'::public.payment_status
        when 'expired' then 'EXPIRED'::public.payment_status
        when 'cancelled' then 'CANCELLED'::public.payment_status
        else 'PENDING'::public.payment_status
      end;
  end if;
end $$;
alter table public.orders alter column payment_status set default 'PENDING';

update public.orders
set package_id = coalesce(package_id, 'five-clips'),
    package_name = coalesce(package_name, '5 Clip'),
    clip_count = coalesce(clip_count, nullif(metadata ->> 'clip_count', '')::integer, 5),
    processing_status = case
      when payment_status = 'PAID' and lower(coalesce(status, '')) in ('paid', 'pending', 'processing') then 'QUEUED'::public.processing_status
      when lower(coalesce(status, '')) in ('completed', 'done') then 'COMPLETED'::public.processing_status
      when lower(coalesce(status, '')) in ('failed', 'error') then 'FAILED'::public.processing_status
      when payment_status = 'PAID' then 'QUEUED'::public.processing_status
      else 'WAITING_PAYMENT'::public.processing_status
    end
where package_id is null or package_name is null or clip_count is null
   or processing_status = 'WAITING_PAYMENT';
alter table public.orders alter column package_id set not null;
alter table public.orders alter column package_name set not null;
alter table public.orders alter column clip_count set not null;
alter table public.orders drop constraint if exists orders_package_id_fkey;
alter table public.orders add constraint orders_package_id_fkey
  foreign key (package_id) references public.packages(id) on delete restrict;

alter table public.payments drop constraint if exists payments_status_check;
update public.payments
set provider_reference = coalesce(provider_reference, payment_id, txn_id, id::text),
    partner_reference = coalesce(partner_reference, order_id::text || '-' || id::text),
    amount = coalesce(amount, (
      select orders.amount::integer from public.orders where orders.id = payments.order_id
    ));
do $$ begin
  if (select udt_name from information_schema.columns
      where table_schema = 'public' and table_name = 'payments' and column_name = 'status') <> 'payment_status' then
    alter table public.payments alter column status drop default;
    alter table public.payments alter column status type public.payment_status
      using case lower(status::text)
        when 'paid' then 'PAID'::public.payment_status
        when 'failed' then 'FAILED'::public.payment_status
        when 'expired' then 'EXPIRED'::public.payment_status
        when 'cancelled' then 'CANCELLED'::public.payment_status
        else 'PENDING'::public.payment_status
      end;
  end if;
end $$;
alter table public.payments alter column provider_reference set not null;
alter table public.payments alter column partner_reference set not null;
alter table public.payments alter column amount set not null;
alter table public.payments alter column status set default 'PENDING';
create unique index if not exists payments_provider_reference_unique on public.payments (provider_reference);
create unique index if not exists payments_partner_reference_unique on public.payments (partner_reference);

do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'clips' and column_name = 'filename') then
    execute 'update public.clips set file_name = coalesce(file_name, filename)';
  else
    update public.clips
    set file_name = coalesce(file_name, 'clip_' || lpad(clip_number::text, 2, '0') || '.mp4');
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'clips' and column_name = 'size_mb') then
    execute 'update public.clips set size_bytes = coalesce(size_bytes, round(coalesce(size_mb, 0) * 1000000)::bigint)';
  else
    update public.clips set size_bytes = coalesce(size_bytes, 0);
  end if;
end $$;
with numbered_clips as (
  select id, row_number() over (partition by order_id order by created_at, id) as clip_number
  from public.clips
  where clip_number is null
)
update public.clips
set clip_number = numbered_clips.clip_number
from numbered_clips
where clips.id = numbered_clips.id;
alter table public.clips alter column clip_number set not null;
alter table public.clips alter column file_name set not null;
alter table public.clips alter column size_bytes set not null;
create unique index if not exists clips_order_clip_number_unique on public.clips (order_id, clip_number);

update public.webhook_events
set provider_event_id = coalesce(provider_event_id, id::text),
    event_type = coalesce(event_type, event_name, 'LEGACY_EVENT');
alter table public.webhook_events alter column provider_event_id set not null;
alter table public.webhook_events alter column event_type set not null;
create unique index if not exists webhook_events_provider_event_unique
  on public.webhook_events (provider, provider_event_id);

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname in ('profiles_id_fkey', 'profiles_auth_user_fkey')
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_auth_user_fkey
      foreign key (id) references auth.users(id) on delete cascade not valid;
  end if;
end $$;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.api_rate_limits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, action, window_start)
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_processing_status_idx on public.orders (processing_status);
create index if not exists payments_order_created_idx on public.payments (order_id, created_at desc);
create index if not exists processing_jobs_status_idx on public.processing_jobs (status, created_at);
create index if not exists clips_order_number_idx on public.clips (order_id, clip_number);
create index if not exists webhook_events_received_idx on public.webhook_events (received_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare table_name text;
begin
  foreach table_name in array array['profiles', 'packages', 'orders', 'payments', 'processing_jobs'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', table_name);
    execute format(
      'create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',
      table_name
    );
  end loop;
end $$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case
      when public.profiles.full_name = '' then excluded.full_name
      else public.profiles.full_name
    end,
    updated_at = now();
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id)
  values (new.id, 'USER_REGISTERED', 'user', new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.handle_auth_user_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = lower(new.email), updated_at = now()
  where id = new.id and new.email is not null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function public.handle_auth_user_update();

create or replace function public.has_role(required_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = required_role
  );
$$;

revoke all on function public.has_role(public.user_role) from public;
grant execute on function public.has_role(public.user_role) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.clips enable row level security;
alter table public.webhook_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.api_rate_limits enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.has_role('ADMIN'));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "packages_read_active" on public.packages;
create policy "packages_read_active" on public.packages
for select to anon, authenticated
using (active = true);

drop policy if exists "orders_select_owner_or_admin" on public.orders;
create policy "orders_select_owner_or_admin" on public.orders
for select to authenticated
using (user_id = (select auth.uid()) or public.has_role('ADMIN'));

drop policy if exists "payments_select_owner_or_admin" on public.payments;
create policy "payments_select_owner_or_admin" on public.payments
for select to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = payments.order_id
      and (orders.user_id = (select auth.uid()) or public.has_role('ADMIN'))
  )
);

drop policy if exists "processing_jobs_select_owner_or_admin" on public.processing_jobs;
create policy "processing_jobs_select_owner_or_admin" on public.processing_jobs
for select to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = processing_jobs.order_id
      and (orders.user_id = (select auth.uid()) or public.has_role('ADMIN'))
  )
);

drop policy if exists "clips_select_owner_or_admin" on public.clips;
create policy "clips_select_owner_or_admin" on public.clips
for select to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = clips.order_id
      and (orders.user_id = (select auth.uid()) or public.has_role('ADMIN'))
  )
);

drop policy if exists "audit_select_admin" on public.audit_logs;
create policy "audit_select_admin" on public.audit_logs
for select to authenticated
using (public.has_role('ADMIN'));

revoke all on public.profiles, public.packages, public.orders, public.payments,
  public.processing_jobs, public.clips, public.webhook_events, public.audit_logs, public.api_rate_limits
from anon, authenticated;
grant select on public.profiles, public.packages, public.orders, public.payments,
  public.processing_jobs, public.clips to authenticated;
grant select on public.packages to anon;
grant update (full_name, avatar_url) on public.profiles to authenticated;
grant all on public.profiles, public.packages, public.orders, public.payments,
  public.processing_jobs, public.clips, public.webhook_events, public.audit_logs, public.api_rate_limits
to service_role;

create or replace function public.consume_user_rate_limit(
  p_user_id uuid,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz;
  current_count integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit' using errcode = '22023';
  end if;
  current_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  insert into public.api_rate_limits (user_id, action, window_start, request_count)
  values (p_user_id, p_action, current_window, 1)
  on conflict (user_id, action, window_start)
  do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into current_count;
  return current_count <= p_limit;
end;
$$;

revoke all on function public.consume_user_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_user_rate_limit(uuid, text, integer, integer) to service_role;

create or replace function public.claim_next_processing_job(p_max_concurrent integer)
returns table (claimed_job_id uuid, claimed_order_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
  next_job public.processing_jobs%rowtype;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_max_concurrent < 1 then
    raise exception 'invalid concurrency limit' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('lakulokal-cloud-run-dispatch'));
  select count(*) into active_count
  from public.processing_jobs
  where status in ('QUEUED', 'DOWNLOADING', 'PROCESSING', 'UPLOADING')
    and cloud_run_execution is not null;
  if active_count >= p_max_concurrent then
    return;
  end if;

  select * into next_job
  from public.processing_jobs
  where status = 'QUEUED' and cloud_run_execution is null
  order by created_at
  for update skip locked
  limit 1;
  if not found then
    return;
  end if;

  update public.processing_jobs
  set cloud_run_execution = 'DISPATCHING', attempt_count = attempt_count + 1
  where id = next_job.id;
  return query select next_job.id, next_job.order_id;
end;
$$;

revoke all on function public.claim_next_processing_job(integer) from public, anon, authenticated;
grant execute on function public.claim_next_processing_job(integer) to service_role;

create or replace function public.confirm_paid_order(
  p_order_id uuid,
  p_provider_reference text,
  p_amount integer
)
returns table (confirmed_order_id uuid, execution_job_id uuid, already_paid boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.orders%rowtype;
  job_id uuid;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into order_row
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  if order_row.amount <> p_amount then
    raise exception 'payment amount mismatch' using errcode = '22003';
  end if;
  if order_row.dana_partner_reference_no <> p_provider_reference then
    raise exception 'payment reference mismatch' using errcode = '22023';
  end if;

  if order_row.payment_status = 'PAID' then
    select id into job_id from public.processing_jobs where order_id = p_order_id;
    return query select p_order_id, job_id, true;
    return;
  end if;
  if order_row.payment_status <> 'PENDING' then
    raise exception 'order is not payable' using errcode = '22023';
  end if;

  update public.orders
  set payment_status = 'PAID',
      processing_status = 'QUEUED',
      paid_at = now(),
      updated_at = now()
  where id = p_order_id;

  update public.payments
  set status = 'PAID', paid_at = now(), updated_at = now()
  where order_id = p_order_id
    and partner_reference = p_provider_reference;

  insert into public.processing_jobs (order_id, status)
  values (p_order_id, 'QUEUED')
  on conflict (order_id) do nothing
  returning id into job_id;

  if job_id is null then
    select id into job_id from public.processing_jobs where order_id = p_order_id;
  end if;

  return query select p_order_id, job_id, false;
end;
$$;

revoke all on function public.confirm_paid_order(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.confirm_paid_order(uuid, text, integer) to service_role;

create or replace function public.admin_dashboard_stats()
returns table (
  total_users bigint,
  total_orders bigint,
  paid_orders bigint,
  processing_orders bigint,
  completed_orders bigint,
  failed_orders bigint,
  revenue_idr bigint,
  total_clips bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('ADMIN') then
    raise exception 'admin role required' using errcode = '42501';
  end if;
  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.orders),
    (select count(*) from public.orders where payment_status = 'PAID'),
    (select count(*) from public.orders where processing_status in ('QUEUED', 'DOWNLOADING', 'PROCESSING', 'UPLOADING')),
    (select count(*) from public.orders where processing_status = 'COMPLETED'),
    (select count(*) from public.orders where processing_status = 'FAILED'),
    (select coalesce(sum(amount), 0)::bigint from public.orders where payment_status = 'PAID'),
    (select count(*) from public.clips);
end;
$$;

revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lakulokal-results', 'lakulokal-results', false, 524288000, array['video/mp4', 'application/zip'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users_read_own_completed_results" on storage.objects;
create policy "users_read_own_completed_results" on storage.objects
for select to authenticated
using (
  bucket_id = 'lakulokal-results'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.clips
    join public.orders on orders.id = clips.order_id
    where orders.user_id = (select auth.uid())
      and orders.processing_status = 'COMPLETED'
      and (clips.storage_path = name or orders.result_zip_path = name)
  )
);

-- Grant an administrator deliberately from the SQL editor after verifying the account:
-- update public.profiles set role = 'ADMIN' where email = 'verified-admin@example.com';

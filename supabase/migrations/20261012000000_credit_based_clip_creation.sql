update public.packages
set active = false,
    updated_at = now()
where active = true
  and id <> '00000000-0000-4000-8000-000000000005';

insert into public.packages (id, name, clip_count, price, currency, active)
values ('00000000-0000-4000-8000-000000000005', '5 Kredit Clip', 5, 1000, 'IDR', true)
on conflict (id) do update
set name = excluded.name,
    clip_count = excluded.clip_count,
    price = excluded.price,
    currency = excluded.currency,
    active = true,
    updated_at = now();

update public.site_configuration
set landing_content = jsonb_set(
  landing_content,
  '{processSteps,2,description}',
  to_jsonb('Unggah bukti QRIS dan tunggu admin mengonfirmasi transaksi. Kredit diberikan setelah persetujuan.'::text)
)
where id = 'main'
  and landing_content #>> '{processSteps,2,description}' like '%otomatis%';

update public.site_configuration
set landing_content = jsonb_set(
  landing_content,
  '{questions,0,answer}',
  to_jsonb('Masuk ke akun, beli kredit lewat QRIS, lalu unggah bukti pembayaran. Admin memeriksa transaksi sebelum kredit ditambahkan.'::text)
)
where id = 'main'
  and landing_content #>> '{questions,0,answer}' like '%otomatis%';

update public.site_configuration
set landing_content = jsonb_set(
  landing_content,
  '{questions,1,answer}',
  to_jsonb('Unggah bukti QRIS pada halaman order dan tunggu admin memeriksa transaksi. Kredit masuk ke saldo setelah pembayaran disetujui.'::text)
)
where id = 'main'
  and landing_content #>> '{questions,1,answer}' like '%otomatis%';

create table public.user_credit_balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  entry_type text not null check (entry_type in ('PURCHASE', 'CLIP_RUN', 'CLIP_RUN_REFUND')),
  amount integer not null check (amount <> 0),
  created_at timestamptz not null default now(),
  unique (order_id, entry_type)
);

create index credit_transactions_user_history_idx
  on public.credit_transactions (user_id, created_at desc);

alter table public.user_credit_balances enable row level security;
alter table public.credit_transactions enable row level security;

create policy user_credit_balances_select_owner on public.user_credit_balances
for select to authenticated
using (user_id = (select auth.uid()));

create policy credit_transactions_select_owner on public.credit_transactions
for select to authenticated
using (user_id = (select auth.uid()));

revoke all on public.user_credit_balances, public.credit_transactions from anon, authenticated;
grant select on public.user_credit_balances, public.credit_transactions to authenticated;
grant all on public.user_credit_balances, public.credit_transactions to service_role;

create or replace function public.grant_credit_purchase()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_transaction_id uuid;
  credit_count integer;
begin
  if old.payment_status is distinct from 'PAID'::public.payment_status
    and new.payment_status = 'PAID'::public.payment_status
    and new.metadata ->> 'order_type' = 'CREDIT_PURCHASE' then
    credit_count := (new.metadata ->> 'credits')::integer;
    if credit_count is distinct from 5
      or new.package_id <> '00000000-0000-4000-8000-000000000005'
      or new.clip_count <> credit_count
      or new.amount <> 1000
      or new.currency <> 'IDR' then
      raise exception 'credit purchase does not match the active package' using errcode = '22023';
    end if;

    insert into public.user_credit_balances (user_id, balance)
    values (new.user_id, 0)
    on conflict (user_id) do nothing;

    insert into public.credit_transactions (user_id, order_id, entry_type, amount)
    values (new.user_id, new.id, 'PURCHASE', credit_count)
    on conflict (order_id, entry_type) do nothing
    returning id into inserted_transaction_id;

    if inserted_transaction_id is not null then
      update public.user_credit_balances
      set balance = balance + credit_count,
          updated_at = now()
      where user_id = new.user_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_grant_credit_purchase
after update of payment_status on public.orders
for each row execute function public.grant_credit_purchase();

create or replace function public.create_credit_clip_order(
  p_user_id uuid,
  p_clip_count integer
)
returns table (order_code text, clip_count integer, created_at timestamptz, available_credits integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  package_row public.packages%rowtype;
  current_balance integer;
  new_order_code text;
  new_order_created_at timestamptz;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_clip_count is null or p_clip_count not in (1, 5) then
    raise exception 'clip count must be one or five' using errcode = '22023';
  end if;

  select * into package_row
  from public.packages
  where id = '00000000-0000-4000-8000-000000000005'
    and active = true
    and clip_count = 5
    and price = 1000
    and currency = 'IDR';
  if not found then
    raise exception 'credit package is not configured' using errcode = 'P0002';
  end if;

  insert into public.user_credit_balances (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into current_balance
  from public.user_credit_balances
  where user_id = p_user_id
  for update;
  if current_balance < p_clip_count then
    raise exception 'insufficient credits' using errcode = '22003';
  end if;

  new_order_code := 'LL-' || to_char(now() at time zone 'UTC', 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.orders (
    order_code,
    user_id,
    youtube_url,
    package_id,
    package_name,
    clip_count,
    amount,
    currency,
    payment_status,
    paid_at,
    metadata
  )
  values (
    new_order_code,
    p_user_id,
    null,
    package_row.id,
    case when p_clip_count = 1 then '1 Clip' else '5 Clip' end,
    p_clip_count,
    0,
    'IDR',
    'PAID',
    now(),
    jsonb_build_object('order_type', 'CREDIT_CLIP_RUN', 'credit_cost', p_clip_count)
  )
  returning created_at into new_order_created_at;

  return query select new_order_code, p_clip_count, new_order_created_at, current_balance;
end;
$$;

create or replace function public.refund_unused_clip_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved_credits integer;
  completed_clips integer;
  refund_credits integer;
  inserted_transaction_id uuid;
begin
  if old.processing_status = 'PROCESSING'
    and new.processing_status = 'FAILED'
    and new.metadata ->> 'order_type' = 'CREDIT_CLIP_RUN' then
    reserved_credits := (new.metadata ->> 'credit_cost')::integer;
    select count(*)::integer into completed_clips
    from public.clips
    where order_id = new.id and upload_status = 'READY';
    refund_credits := greatest(0, reserved_credits - completed_clips);

    if refund_credits > 0 then
      insert into public.credit_transactions (user_id, order_id, entry_type, amount)
      values (new.user_id, new.id, 'CLIP_RUN_REFUND', refund_credits)
      on conflict (order_id, entry_type) do nothing
      returning id into inserted_transaction_id;

      if inserted_transaction_id is not null then
        update public.user_credit_balances
        set balance = balance + refund_credits,
            updated_at = now()
        where user_id = new.user_id;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_refund_unused_clip_credits
after update of processing_status on public.orders
for each row execute function public.refund_unused_clip_credits();

create or replace function public.update_browser_processing_status(
  p_order_id uuid,
  p_status text,
  p_progress integer,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.orders%rowtype;
  job_row public.processing_jobs%rowtype;
  current_balance integer;
  reserved_credits integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('PROCESSING', 'COMPLETED', 'FAILED')
    or p_progress < 0 or p_progress > 100
    or (p_status = 'PROCESSING' and p_progress = 100)
    or (p_status = 'COMPLETED' and p_progress <> 100) then
    raise exception 'invalid browser processing status' using errcode = '22023';
  end if;

  select * into order_row
  from public.orders
  where id = p_order_id
  for update;
  if not found
    or order_row.youtube_url is not null
    or order_row.payment_status <> 'PAID'
    or order_row.metadata ->> 'order_type' = 'CREDIT_PURCHASE' then
    raise exception 'paid browser order required' using errcode = '22023';
  end if;

  insert into public.processing_jobs (order_id, status)
  values (p_order_id, 'QUEUED'::public.processing_status)
  on conflict (order_id) do nothing;

  select * into job_row
  from public.processing_jobs
  where order_id = p_order_id
  for update;
  if not found then
    raise exception 'processing job could not be created' using errcode = 'P0002';
  end if;

  if p_status = 'PROCESSING' then
    if order_row.metadata ->> 'order_type' = 'CREDIT_CLIP_RUN'
      and job_row.status in ('FAILED', 'COMPLETED') then
      raise exception 'credit clip run cannot be restarted' using errcode = '22023';
    end if;
    if job_row.status not in ('QUEUED', 'WAITING_PAYMENT', 'FAILED', 'COMPLETED', 'PROCESSING') then
      raise exception 'job cannot be processed' using errcode = '22023';
    end if;
    if order_row.metadata ->> 'order_type' = 'CREDIT_CLIP_RUN'
      and job_row.status <> 'PROCESSING' then
      insert into public.user_credit_balances (user_id, balance)
      values (order_row.user_id, 0)
      on conflict (user_id) do nothing;

      select balance into current_balance
      from public.user_credit_balances
      where user_id = order_row.user_id
      for update;
      reserved_credits := (order_row.metadata ->> 'credit_cost')::integer;
      if current_balance < reserved_credits then
        raise exception 'insufficient credits' using errcode = '22003';
      end if;
      update public.user_credit_balances
      set balance = balance - reserved_credits,
          updated_at = now()
      where user_id = order_row.user_id;
      insert into public.credit_transactions (user_id, order_id, entry_type, amount)
      values (order_row.user_id, order_row.id, 'CLIP_RUN', -reserved_credits);
    end if;
    update public.processing_jobs
    set status = 'PROCESSING',
        progress = p_progress,
        attempt_count = attempt_count + case when job_row.status = 'PROCESSING' then 0 else 1 end,
        error_message = null,
        started_at = case when job_row.status = 'PROCESSING' then coalesce(started_at, now()) else now() end,
        finished_at = null
    where id = job_row.id;
    update public.orders
    set processing_status = 'PROCESSING',
        processing_started_at = now(),
        processing_completed_at = null,
        result_expires_at = null,
        results_deleted_at = null,
        error_message = null
    where id = p_order_id;
  elsif p_status = 'COMPLETED' then
    if job_row.status <> 'PROCESSING' then
      raise exception 'job is not processing' using errcode = '22023';
    end if;
    if (select count(*) from public.clips where order_id = p_order_id and upload_status = 'READY') <> order_row.clip_count then
      raise exception 'all browser clips must be stored before completing' using errcode = '22023';
    end if;
    update public.processing_jobs
    set status = 'COMPLETED', progress = 100, error_message = null, finished_at = now()
    where id = job_row.id;
    update public.orders
    set processing_status = 'COMPLETED',
        processing_completed_at = now(),
        result_expires_at = now() + interval '24 hours',
        error_message = null
    where id = p_order_id;
  else
    if job_row.status <> 'PROCESSING' then
      raise exception 'job is not processing' using errcode = '22023';
    end if;
    update public.processing_jobs
    set status = 'FAILED',
        progress = p_progress,
        error_message = left(coalesce(p_error_message, 'Pemrosesan browser gagal.'), 400),
        finished_at = now()
    where id = job_row.id;
    update public.orders
    set processing_status = 'FAILED',
        processing_completed_at = now(),
        result_expires_at = now() + interval '24 hours',
        error_message = left(coalesce(p_error_message, 'Pemrosesan browser gagal.'), 400)
    where id = p_order_id;
  end if;
end;
$$;

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
    (
      select count(*)
      from public.orders o
      where o.payment_status = 'PAID'
        and o.metadata ->> 'order_type' is distinct from 'CREDIT_CLIP_RUN'
        and not exists (
          select 1 from public.payment_proofs proof
          where proof.order_id = o.id
            and proof.review_status = 'APPROVED'
            and proof.reviewed_by is null
        )
    ),
    (select count(*) from public.orders where processing_status in ('QUEUED', 'DOWNLOADING', 'PROCESSING', 'UPLOADING')),
    (select count(*) from public.orders where processing_status = 'COMPLETED'),
    (select count(*) from public.orders where processing_status = 'FAILED'),
    (
      select coalesce(sum(o.amount), 0)::bigint
      from public.orders o
      where o.payment_status = 'PAID'
        and o.metadata ->> 'order_type' is distinct from 'CREDIT_CLIP_RUN'
        and not exists (
          select 1 from public.payment_proofs proof
          where proof.order_id = o.id
            and proof.review_status = 'APPROVED'
            and proof.reviewed_by is null
        )
    ),
    (select count(*) from public.clips);
end;
$$;

drop function if exists public.auto_approve_manual_qris_proof(uuid);

revoke all on function public.create_credit_clip_order(uuid, integer) from public, anon, authenticated;
grant execute on function public.create_credit_clip_order(uuid, integer) to service_role;
revoke all on function public.update_browser_processing_status(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.update_browser_processing_status(uuid, text, integer, text) to service_role;
revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated, service_role;

notify pgrst, 'reload schema';

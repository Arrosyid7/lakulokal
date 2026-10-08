alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments
  add constraint payments_provider_check check (provider in ('DANA', 'MANUAL_QRIS'));

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  storage_path text not null unique,
  ocr_amount integer not null check (ocr_amount >= 0),
  ocr_transaction_date date not null,
  review_status text not null default 'SUBMITTED'
    check (review_status in ('SUBMITTED', 'APPROVED', 'REJECTED')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text
);

create index payment_proofs_pending_review_idx
  on public.payment_proofs (submitted_at)
  where review_status = 'SUBMITTED';
create index payment_proofs_order_history_idx
  on public.payment_proofs (order_id, submitted_at desc);
create unique index payment_proofs_one_pending_per_payment_idx
  on public.payment_proofs (payment_id)
  where review_status = 'SUBMITTED';

alter table public.payment_proofs enable row level security;
create policy payment_proofs_select_owner_or_admin on public.payment_proofs
for select to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = payment_proofs.order_id
      and (orders.user_id = (select auth.uid()) or public.has_role('ADMIN'))
  )
);
revoke all on public.payment_proofs from anon, authenticated;
grant select on public.payment_proofs to authenticated;
grant all on public.payment_proofs to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
  payment_row public.payments%rowtype;
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

  select * into payment_row
  from public.payments
  where order_id = p_order_id
    and partner_reference = p_provider_reference
  for update;
  if not found or payment_row.amount <> p_amount then
    raise exception 'payment reference mismatch' using errcode = '22023';
  end if;
  if order_row.dana_partner_reference_no is not null
    and order_row.dana_partner_reference_no <> p_provider_reference then
    raise exception 'payment reference mismatch' using errcode = '22023';
  end if;
  if payment_row.provider = 'MANUAL_QRIS' and not exists (
    select 1 from public.payment_proofs
    where payment_id = payment_row.id
      and review_status = 'SUBMITTED'
      and ocr_amount = p_amount
  ) then
    raise exception 'submitted manual QRIS proof required' using errcode = '22023';
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
      processing_status = case
        when processing_status = 'WAITING_PAYMENT' then 'QUEUED'::public.processing_status
        else processing_status
      end,
      paid_at = now(),
      updated_at = now()
  where id = p_order_id;

  update public.payments
  set status = 'PAID', paid_at = now(), updated_at = now()
  where id = payment_row.id;

  insert into public.processing_jobs (order_id, status)
  values (
    p_order_id,
    case when order_row.processing_status = 'WAITING_PAYMENT'
      then 'QUEUED'::public.processing_status
      else order_row.processing_status
    end
  )
  on conflict (order_id) do nothing
  returning id into job_id;

  if job_id is null then
    select id into job_id from public.processing_jobs where order_id = p_order_id;
  end if;

  return query select p_order_id, job_id, false;
end;
$$;

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
  proof_available boolean;
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
  if not found or order_row.youtube_url is not null then
    raise exception 'browser order required' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.payment_proofs
    where order_id = p_order_id
      and review_status in ('SUBMITTED', 'REJECTED')
      and ocr_amount = order_row.amount
  ) into proof_available;
  if order_row.payment_status <> 'PAID' and not proof_available then
    raise exception 'verified payment or screened proof required' using errcode = '22023';
  end if;

  insert into public.processing_jobs (order_id, status)
  values (
    p_order_id,
    case when order_row.payment_status = 'PAID'
      then 'QUEUED'::public.processing_status
      else 'WAITING_PAYMENT'::public.processing_status
    end
  )
  on conflict (order_id) do nothing;

  select * into job_row
  from public.processing_jobs
  where order_id = p_order_id
  for update;
  if not found then
    raise exception 'processing job could not be created' using errcode = 'P0002';
  end if;

  if p_status = 'PROCESSING' then
    if job_row.status not in ('QUEUED', 'WAITING_PAYMENT', 'FAILED', 'COMPLETED', 'PROCESSING') then
      raise exception 'job cannot be processed' using errcode = '22023';
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
        error_message = null
    where id = p_order_id;
  elsif p_status = 'COMPLETED' then
    if job_row.status <> 'PROCESSING' then
      raise exception 'job is not processing' using errcode = '22023';
    end if;
    update public.processing_jobs
    set status = 'COMPLETED', progress = 100, error_message = null, finished_at = now()
    where id = job_row.id;
    update public.orders
    set processing_status = 'COMPLETED',
        processing_completed_at = now(),
        error_message = null
    where id = p_order_id;
  else
    if job_row.status <> 'PROCESSING' then
      raise exception 'job is not processing' using errcode = '22023';
    end if;
    update public.processing_jobs
    set status = 'FAILED', progress = p_progress,
        error_message = left(coalesce(p_error_message, 'Pemrosesan browser gagal.'), 400),
        finished_at = now()
    where id = job_row.id;
    update public.orders
    set processing_status = 'FAILED',
        error_message = left(coalesce(p_error_message, 'Pemrosesan browser gagal.'), 400)
    where id = p_order_id;
  end if;
end;
$$;

create or replace function public.review_manual_qris_payment(
  p_proof_id uuid,
  p_decision text,
  p_admin_user_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  proof_row public.payment_proofs%rowtype;
  payment_row public.payments%rowtype;
  order_row public.orders%rowtype;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_decision not in ('APPROVE', 'REJECT') then
    raise exception 'invalid payment review decision' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_admin_user_id and role = 'ADMIN'
  ) then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  select * into proof_row
  from public.payment_proofs
  where id = p_proof_id
  for update;
  if not found or proof_row.review_status <> 'SUBMITTED' then
    raise exception 'submitted payment proof required' using errcode = '22023';
  end if;

  select * into payment_row
  from public.payments
  where id = proof_row.payment_id
    and order_id = proof_row.order_id
    and provider = 'MANUAL_QRIS'
  for update;
  if not found then
    raise exception 'manual QRIS payment not found' using errcode = 'P0002';
  end if;

  select * into order_row
  from public.orders
  where id = proof_row.order_id
  for update;
  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if p_decision = 'APPROVE' then
    if payment_row.status <> 'PENDING' or proof_row.ocr_amount <> order_row.amount then
      raise exception 'payment proof does not match pending order' using errcode = '22023';
    end if;
    perform public.confirm_paid_order(order_row.id, payment_row.partner_reference, payment_row.amount);
    update public.payment_proofs
    set review_status = 'APPROVED',
        reviewed_at = now(),
        reviewed_by = p_admin_user_id,
        review_note = nullif(left(coalesce(p_note, ''), 400), '')
    where id = p_proof_id;
  else
    update public.payment_proofs
    set review_status = 'REJECTED',
        reviewed_at = now(),
        reviewed_by = p_admin_user_id,
        review_note = nullif(left(coalesce(p_note, ''), 400), '')
    where id = p_proof_id;
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    p_admin_user_id,
    case when p_decision = 'APPROVE' then 'MANUAL_QRIS_APPROVED' else 'MANUAL_QRIS_REJECTED' end,
    'payment_proof',
    p_proof_id,
    jsonb_build_object('order_id', order_row.id, 'payment_id', payment_row.id, 'note', nullif(left(coalesce(p_note, ''), 400), ''))
  );
end;
$$;

revoke all on function public.confirm_paid_order(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.confirm_paid_order(uuid, text, integer) to service_role;
revoke all on function public.update_browser_processing_status(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.update_browser_processing_status(uuid, text, integer, text) to service_role;
revoke all on function public.review_manual_qris_payment(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.review_manual_qris_payment(uuid, text, uuid, text) to service_role;

notify pgrst, 'reload schema';

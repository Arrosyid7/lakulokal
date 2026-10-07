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

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
    set status = 'FAILED', progress = p_progress,
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

revoke all on function public.update_browser_processing_status(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.update_browser_processing_status(uuid, text, integer, text) to service_role;

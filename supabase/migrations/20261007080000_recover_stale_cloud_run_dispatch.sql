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
  update public.processing_jobs
  set cloud_run_execution = null,
      error_message = 'Klaim dispatch Cloud Run kedaluwarsa sebelum execution tercatat.'
  where status = 'QUEUED'
    and cloud_run_execution = 'DISPATCHING'
    and updated_at < now() - interval '15 minutes';

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

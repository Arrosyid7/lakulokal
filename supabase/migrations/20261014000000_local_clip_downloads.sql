alter table public.processing_jobs
  add column if not exists completed_clips integer not null default 0;

update public.processing_jobs job
set completed_clips = (
  select count(*)::integer
  from public.clips clip
  where clip.order_id = job.order_id
    and clip.upload_status = 'READY'
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.processing_jobs'::regclass
      and conname = 'processing_jobs_completed_clips_nonnegative'
  ) then
    alter table public.processing_jobs
      add constraint processing_jobs_completed_clips_nonnegative
      check (completed_clips >= 0);
  end if;
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
    select job.completed_clips into completed_clips
    from public.processing_jobs job
    where job.order_id = new.id;
    refund_credits := greatest(0, reserved_credits - coalesce(completed_clips, 0));

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

create or replace function public.update_browser_processing_status_core(
  p_order_id uuid,
  p_status text,
  p_progress integer,
  p_error_message text,
  p_completed_clips integer
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
  has_stored_clips boolean;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('PROCESSING', 'COMPLETED', 'FAILED')
    or p_progress is null or p_progress < 0 or p_progress > 100
    or p_completed_clips is null or p_completed_clips < 0
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
  if p_completed_clips > order_row.clip_count then
    raise exception 'completed clip count exceeds order clip count' using errcode = '22023';
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
    if job_row.status = 'PROCESSING' and p_completed_clips < job_row.completed_clips then
      raise exception 'completed clip count cannot decrease' using errcode = '22023';
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
        completed_clips = p_completed_clips,
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
    if p_completed_clips <> order_row.clip_count then
      raise exception 'all clips must be completed before completing' using errcode = '22023';
    end if;
    if p_completed_clips < job_row.completed_clips then
      raise exception 'completed clip count cannot decrease' using errcode = '22023';
    end if;
    select exists (
      select 1 from public.clips
      where order_id = p_order_id and upload_status = 'READY'
    ) into has_stored_clips;
    update public.processing_jobs
    set status = 'COMPLETED',
        progress = 100,
        completed_clips = p_completed_clips,
        error_message = null,
        finished_at = now()
    where id = job_row.id;
    update public.orders
    set processing_status = 'COMPLETED',
        processing_completed_at = now(),
        result_expires_at = case when has_stored_clips then now() + interval '24 hours' else null end,
        error_message = null
    where id = p_order_id;
  else
    if job_row.status <> 'PROCESSING' then
      raise exception 'job is not processing' using errcode = '22023';
    end if;
    if p_completed_clips < job_row.completed_clips then
      raise exception 'completed clip count cannot decrease' using errcode = '22023';
    end if;
    select exists (
      select 1 from public.clips
      where order_id = p_order_id and upload_status = 'READY'
    ) into has_stored_clips;
    update public.processing_jobs
    set status = 'FAILED',
        progress = p_progress,
        completed_clips = p_completed_clips,
        error_message = left(coalesce(p_error_message, 'Pemrosesan browser gagal.'), 400),
        finished_at = now()
    where id = job_row.id;
    update public.orders
    set processing_status = 'FAILED',
        processing_completed_at = now(),
        result_expires_at = case when has_stored_clips then now() + interval '24 hours' else null end,
        error_message = left(coalesce(p_error_message, 'Pemrosesan browser gagal.'), 400)
    where id = p_order_id;
  end if;
end;
$$;

create or replace function public.update_browser_processing_status(
  p_order_id uuid,
  p_status text,
  p_progress integer,
  p_error_message text,
  p_completed_clips integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.update_browser_processing_status_core(
    p_order_id,
    p_status,
    p_progress,
    p_error_message,
    p_completed_clips
  );
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
  completed_clips integer;
begin
  select count(*)::integer into completed_clips
  from public.clips
  where order_id = p_order_id
    and upload_status = 'READY';
  perform public.update_browser_processing_status_core(
    p_order_id,
    p_status,
    p_progress,
    p_error_message,
    coalesce(completed_clips, 0)
  );
end;
$$;

revoke all on function public.update_browser_processing_status_core(uuid, text, integer, text, integer) from public, anon, authenticated;
grant execute on function public.update_browser_processing_status_core(uuid, text, integer, text, integer) to service_role;
revoke all on function public.update_browser_processing_status(uuid, text, integer, text, integer) from public, anon, authenticated;
grant execute on function public.update_browser_processing_status(uuid, text, integer, text, integer) to service_role;
revoke all on function public.update_browser_processing_status(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.update_browser_processing_status(uuid, text, integer, text) to service_role;

update public.site_configuration
set landing_content = jsonb_set(
  jsonb_set(
    landing_content,
    '{heroNote}',
    to_jsonb('Hasil hanya tersedia di halaman pemrosesan. Unduh sebelum keluar.'::text)
  ),
  '{questions}',
  (
    select coalesce(
      jsonb_agg(
        case
          when question.value ->> 'question' = 'Apa yang terjadi jika pembuatan clip gagal?' then
            jsonb_set(question.value, '{answer}',
              to_jsonb('Kredit untuk clip yang belum berhasil dibuat dikembalikan. Clip yang sudah selesai tetap menggunakan kredit; unduh clip tersebut sebelum meninggalkan halaman.'::text))
          when question.value ->> 'question' = 'Apakah video dan hasilnya disimpan?' then
            jsonb_set(question.value, '{answer}',
              to_jsonb('Video sumber dan clip hasil diproses di browser, bukan disimpan di server. Unduh setiap clip sebelum meninggalkan halaman; status order tetap terlihat di riwayat.'::text))
          else question.value
        end
        order by question.ordinality
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(landing_content -> 'questions')
      with ordinality as question(value, ordinality)
  )
),
updated_at = now()
where id = 'main';

update public.site_articles as article
set sections = (
  select coalesce(
    jsonb_agg(
      case
        when section.value ->> 'heading' = 'Pahami alur order' then
          jsonb_set(
            section.value,
            '{paragraphs,1}',
            to_jsonb('Gunakan dashboard untuk melihat saldo dan status order. Clip hasil hanya tersedia di halaman proses yang sedang terbuka, jadi unduh setiap file sebelum meninggalkannya.'::text)
          )
        when section.value ->> 'heading' = 'Simpan hasil dengan tertib' then
          jsonb_set(
            section.value,
            '{paragraphs,0}',
            to_jsonb('Setelah tiap clip selesai dibuat, unduh file ke perangkat dan pindahkan ke penyimpanan yang Anda kelola. File hasil tidak disimpan di server; jika halaman ditutup sebelum unduhan, clip itu tidak dapat dipulihkan.'::text)
          )
        else section.value
      end
      order by section.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(article.sections)
    with ordinality as section(value, ordinality)
)
where article.slug = 'video-untuk-clip-pendek';

update public.site_articles as article
set sections = (
  select coalesce(
    jsonb_agg(
      case
        when section.value ->> 'heading' = 'Tinjau hasil sebelum dibagikan'
          and jsonb_array_length(section.value -> 'paragraphs') >= 2 then
          jsonb_set(
            section.value,
            '{paragraphs,1}',
            to_jsonb('LakuLokal memproses file video yang Anda pilih dari perangkat, bukan tautan YouTube. File sumber dan hasil clip diproses di browser. Status proses tetap tercatat di riwayat order, tetapi file hasil tidak disimpan di sana.'::text)
          )
        else section.value
      end
      order by section.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(article.sections)
    with ordinality as section(value, ordinality)
)
where article.slug = 'clip-video-youtube-yang-jelas';

notify pgrst, 'reload schema';

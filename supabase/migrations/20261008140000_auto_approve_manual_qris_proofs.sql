create or replace function public.auto_approve_manual_qris_proof(p_proof_id uuid)
returns table (confirmed_order_id uuid, already_paid boolean)
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

  select * into proof_row
  from public.payment_proofs
  where id = p_proof_id
  for update;
  if not found then
    raise exception 'payment proof not found' using errcode = 'P0002';
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
  if not found or proof_row.ocr_amount <> order_row.amount or payment_row.amount <> order_row.amount then
    raise exception 'payment proof does not match order' using errcode = '22023';
  end if;

  if proof_row.review_status = 'APPROVED' and order_row.payment_status = 'PAID' then
    return query select order_row.id, true;
    return;
  end if;
  if proof_row.review_status <> 'SUBMITTED' or payment_row.status <> 'PENDING' or order_row.payment_status <> 'PENDING' then
    raise exception 'submitted proof for pending manual QRIS payment required' using errcode = '22023';
  end if;

  perform public.confirm_paid_order(order_row.id, payment_row.partner_reference, payment_row.amount);

  update public.payment_proofs
  set review_status = 'APPROVED',
      reviewed_at = now(),
      reviewed_by = null,
      review_note = 'Otomatis setelah nominal OCR cocok. Dana tidak diverifikasi ke penyedia pembayaran.'
  where id = p_proof_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    null,
    'MANUAL_QRIS_AUTO_APPROVED',
    'payment_proof',
    p_proof_id,
    jsonb_build_object(
      'order_id', order_row.id,
      'payment_id', payment_row.id,
      'verification', 'ocr_match_only',
      'funds_verified', false
    )
  );

  return query select order_row.id, false;
end;
$$;

revoke all on function public.auto_approve_manual_qris_proof(uuid) from public, anon, authenticated;
grant execute on function public.auto_approve_manual_qris_proof(uuid) to service_role;

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

revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated, service_role;

update public.site_configuration
set landing_content = jsonb_set(
  landing_content,
  '{processSteps,2,description}',
  to_jsonb('Bayar dengan QRIS dan unggah bukti. Order disetujui otomatis jika OCR mencocokkan nominal dan tanggal.'::text)
)
where id = 'main'
  and landing_content #>> '{processSteps,2,description}' = 'Pindai QRIS DANA. Order diproses setelah pembayaran diverifikasi.';

update public.site_configuration
set landing_content = jsonb_set(
  landing_content,
  '{questions,1,answer}',
  to_jsonb('Unggah bukti QRIS. Order disetujui otomatis jika OCR mencocokkan nominal dan tanggal. OCR tidak memastikan dana diterima.'::text)
)
where id = 'main'
  and landing_content #>> '{questions,1,answer}' = 'Pembayaran order menggunakan QRIS DANA. Server memeriksa status transaksi ke provider sebelum order ditandai lunas.';

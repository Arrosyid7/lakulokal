alter table public.payment_proofs
  alter column ocr_transaction_date drop not null;

update public.site_configuration
set landing_content = jsonb_set(
  landing_content,
  '{questions}',
  coalesce(landing_content -> 'questions', '[]'::jsonb)
    || jsonb_build_array(jsonb_build_object(
      'question', 'Apakah OCR membaca tanggal transaksi?',
      'answer', 'Tidak. OCR hanya membaca dan mencocokkan nominal. Admin tetap memeriksa transaksi langsung di rekening atau aplikasi merchant.'
    ))
),
updated_at = now()
where id = 'main'
  and not exists (
    select 1
    from jsonb_array_elements(coalesce(landing_content -> 'questions', '[]'::jsonb)) as question(value)
    where question.value ->> 'question' = 'Apakah OCR membaca tanggal transaksi?'
  );

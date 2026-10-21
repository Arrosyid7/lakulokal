update public.packages
set active = false,
    updated_at = now()
where active = true
  and id not in (
    '00000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000015',
    '00000000-0000-4000-8000-000000000020',
    '00000000-0000-4000-8000-000000000025'
  );

insert into public.packages (id, name, clip_count, price, currency, active)
values
  ('00000000-0000-4000-8000-000000000005', '5 Kredit Clip', 5, 1000, 'IDR', true),
  ('00000000-0000-4000-8000-000000000010', '10 Kredit Clip', 10, 2000, 'IDR', true),
  ('00000000-0000-4000-8000-000000000015', '15 Kredit Clip', 15, 3000, 'IDR', true),
  ('00000000-0000-4000-8000-000000000020', '20 Kredit Clip', 20, 4000, 'IDR', true),
  ('00000000-0000-4000-8000-000000000025', '25 Kredit Clip', 25, 5000, 'IDR', true)
on conflict (id) do update
set name = excluded.name,
    clip_count = excluded.clip_count,
    price = excluded.price,
    currency = excluded.currency,
    active = true,
    updated_at = now();

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
    if not exists (
      select 1
      from (values
        ('00000000-0000-4000-8000-000000000005', 5, 1000),
        ('00000000-0000-4000-8000-000000000010', 10, 2000),
        ('00000000-0000-4000-8000-000000000015', 15, 3000),
        ('00000000-0000-4000-8000-000000000020', 20, 4000),
        ('00000000-0000-4000-8000-000000000025', 25, 5000)
      ) as configured(package_id, package_credits, package_price)
      where configured.package_id = new.package_id
        and configured.package_credits = credit_count
        and configured.package_credits = new.clip_count
        and configured.package_price = new.amount
        and new.package_name = configured.package_credits::text || ' Kredit Clip'
        and new.currency = 'IDR'
    ) then
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

update public.site_configuration
set landing_content = jsonb_set(landing_content, '{metaDescription}',
      to_jsonb('Pilih paket 5 hingga 25 kredit lewat QRIS, tunggu persetujuan admin, lalu buat clip dari video di perangkat Anda.'::text)),
    updated_at = now()
where id = 'main'
  and landing_content ->> 'metaDescription' = 'Beli 5 kredit seharga Rp1.000 lewat QRIS, tunggu persetujuan admin, lalu buat clip dari video di perangkat Anda.';

update public.site_configuration
set landing_content = jsonb_set(landing_content, '{heroDescription}',
      to_jsonb('Pilih paket 5 hingga 25 kredit lewat QRIS. Setelah admin menyetujui pembayaran, buat satu clip dengan waktu pilihan sendiri atau lima clip sekaligus.'::text)),
    updated_at = now()
where id = 'main'
  and landing_content ->> 'heroDescription' = 'Beli 5 kredit seharga Rp1.000 lewat QRIS. Setelah admin menyetujui pembayaran, buat satu clip dengan waktu pilihan sendiri atau lima clip sekaligus.';

update public.site_configuration
set landing_content = jsonb_set(landing_content, '{processSteps,1,title}',
      to_jsonb('Pilih nominal dan bayar dengan QRIS'::text)),
    updated_at = now()
where id = 'main'
  and landing_content #>> '{processSteps,1,title}' = 'Bayar Rp1.000 dengan QRIS';

update public.site_configuration
set landing_content = jsonb_set(landing_content, '{processSteps,1,description}',
      to_jsonb('Pilih pembayaran Rp1.000 hingga Rp5.000 untuk mendapat 5 hingga 25 kredit. Unggah bukti pada halaman order agar admin dapat memeriksanya.'::text)),
    updated_at = now()
where id = 'main'
  and landing_content #>> '{processSteps,1,description}' = 'Pembayaran membeli 5 kredit. Unggah bukti QRIS pada halaman order agar admin dapat memeriksanya.';

update public.site_configuration
set landing_content = jsonb_set(landing_content, '{processSteps,2,description}',
      to_jsonb('Order tetap menunggu selama pemeriksaan. Saldo bertambah sesuai paket setelah pembayaran disetujui.'::text)),
    updated_at = now()
where id = 'main'
  and landing_content #>> '{processSteps,2,description}' = 'Order tetap menunggu selama pemeriksaan. Saldo bertambah 5 kredit setelah pembayaran disetujui.';

update public.site_configuration
set landing_content = jsonb_set(landing_content, '{pricingDescription}',
      to_jsonb('Pilih 5, 10, 15, 20, atau 25 kredit seharga Rp1.000 hingga Rp5.000. Setiap clip menggunakan 1 kredit.'::text)),
    updated_at = now()
where id = 'main'
  and landing_content ->> 'pricingDescription' = 'Bayar Rp1.000 untuk 5 kredit. Setiap clip menggunakan 1 kredit.';

update public.site_configuration
set landing_content = jsonb_set(landing_content, '{questions,0,answer}',
      to_jsonb('Pilih paket Rp1.000, Rp2.000, Rp3.000, Rp4.000, atau Rp5.000 untuk mendapat 5, 10, 15, 20, atau 25 kredit. Setiap clip menggunakan 1 kredit.'::text)),
    updated_at = now()
where id = 'main'
  and landing_content #>> '{questions,0,answer}' = 'Rp1.000 membeli 5 kredit. Setiap clip menggunakan 1 kredit, jadi satu pembelian cukup untuk membuat lima clip.';

update public.site_articles
set sections = (
  select coalesce(
    jsonb_agg(
      case
        when section.value ->> 'heading' = 'Pahami alur order' then
          jsonb_set(
            section.value,
            '{paragraphs,0}',
            to_jsonb('Pilih paket Rp1.000 hingga Rp5.000 melalui QRIS untuk mendapat 5 hingga 25 kredit, lalu unggah bukti pembayaran di halaman order. Admin memeriksa transaksi dan saldo bertambah setelah pembayaran disetujui.'::text)
          )
        else section.value
      end
      order by section.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(public.site_articles.sections)
    with ordinality as section(value, ordinality)
)
where slug = 'video-untuk-clip-pendek'
  and exists (
    select 1
    from jsonb_array_elements(public.site_articles.sections) as section(value)
    where section.value ->> 'heading' = 'Pahami alur order'
      and section.value #>> '{paragraphs,0}' = 'Beli 5 kredit seharga Rp1.000 melalui QRIS, lalu unggah bukti pembayaran di halaman order. Admin memeriksa transaksi dan saldo bertambah setelah pembayaran disetujui.'
  );

notify pgrst, 'reload schema';

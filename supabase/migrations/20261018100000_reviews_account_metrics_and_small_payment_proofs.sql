create table public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 1 and 80),
  review_text text not null check (char_length(review_text) between 1 and 600),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_reviews_published_created_idx
  on public.customer_reviews (published, created_at desc);

alter table public.customer_reviews enable row level security;
grant select on public.customer_reviews to anon, authenticated;

create policy customer_reviews_public_read on public.customer_reviews
for select to anon, authenticated
using (published = true);

create or replace function public.admin_account_metrics(p_user_ids uuid[])
returns table (
  user_id uuid,
  credit_balance integer,
  completed_clips bigint,
  total_transactions bigint,
  total_paid_idr bigint
)
language sql
set search_path = ''
as $$
  with selected_users as (
    select profile.id as user_id
    from public.profiles as profile
    where profile.id = any(coalesce(p_user_ids, array[]::uuid[]))
  ),
  balances as (
    select balance.user_id, balance.balance
    from public.user_credit_balances as balance
    where balance.user_id = any(coalesce(p_user_ids, array[]::uuid[]))
  ),
  clip_totals as (
    select orders.user_id, count(clips.id)::bigint as completed_clips
    from public.clips as clips
    join public.orders as orders on orders.id = clips.order_id
    where orders.user_id = any(coalesce(p_user_ids, array[]::uuid[]))
      and clips.upload_status = 'READY'
    group by orders.user_id
  ),
  payment_totals as (
    select
      orders.user_id,
      count(*)::bigint as total_transactions,
      coalesce(sum(orders.amount), 0)::bigint as total_paid_idr
    from public.orders as orders
    where orders.user_id = any(coalesce(p_user_ids, array[]::uuid[]))
      and orders.payment_status = 'PAID'
      and orders.metadata ->> 'order_type' is distinct from 'CREDIT_CLIP_RUN'
      and not exists (
        select 1
        from public.payment_proofs as proof
        where proof.order_id = orders.id
          and proof.review_status = 'APPROVED'
          and proof.reviewed_by is null
      )
    group by orders.user_id
  )
  select
    selected_users.user_id,
    coalesce(balances.balance, 0),
    coalesce(clip_totals.completed_clips, 0),
    coalesce(payment_totals.total_transactions, 0),
    coalesce(payment_totals.total_paid_idr, 0)
  from selected_users
  left join balances on balances.user_id = selected_users.user_id
  left join clip_totals on clip_totals.user_id = selected_users.user_id
  left join payment_totals on payment_totals.user_id = selected_users.user_id;
$$;

revoke all on function public.admin_account_metrics(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_account_metrics(uuid[]) to service_role;

update storage.buckets
set file_size_limit = 768000,
    allowed_mime_types = array['image/jpeg']
where id = 'payment-proofs';

notify pgrst, 'reload schema';

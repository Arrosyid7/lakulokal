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
  where public.packages.id = '00000000-0000-4000-8000-000000000005'
    and public.packages.active = true
    and public.packages.clip_count = 5
    and public.packages.price = 1000
    and public.packages.currency = 'IDR';
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

revoke all on function public.create_credit_clip_order(uuid, integer) from public, anon, authenticated;
grant execute on function public.create_credit_clip_order(uuid, integer) to service_role;

notify pgrst, 'reload schema';

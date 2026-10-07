do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'mode'
  ) then
    alter table public.orders alter column mode drop not null;
  end if;
end $$;

notify pgrst, 'reload schema';

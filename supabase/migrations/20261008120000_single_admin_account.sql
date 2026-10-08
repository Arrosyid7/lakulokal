create unique index if not exists profiles_single_admin_role
  on public.profiles (role)
  where role = 'ADMIN';

create or replace function public.guard_admin_role_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role = 'ADMIN'
    and coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
    and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Only trusted operators can assign the ADMIN role'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_admin_role_assignment() from public, anon, authenticated;

drop trigger if exists profiles_guard_admin_role on public.profiles;
create trigger profiles_guard_admin_role
  before insert or update of role on public.profiles
  for each row execute function public.guard_admin_role_assignment();

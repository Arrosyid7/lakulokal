create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case
      when public.profiles.full_name = '' then excluded.full_name
      else public.profiles.full_name
    end,
    updated_at = now();

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id)
  values (new.id, 'USER_REGISTERED', 'user', new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, email, full_name, avatar_url)
select
  users.id,
  lower(users.email),
  coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    split_part(users.email, '@', 1)
  ),
  nullif(users.raw_user_meta_data ->> 'avatar_url', '')
from auth.users as users
where users.email is not null
  and not exists (
    select 1
    from public.profiles as profiles
    where profiles.id = users.id
  )
on conflict do nothing;

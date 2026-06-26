-- Function: keep public.users.display_name in sync if auth metadata later changes
create or replace function public.handle_updated_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  -- Only bother if display_name/full_name changed or was added
  if (coalesce(new.raw_user_meta_data ->> 'display_name','') is distinct from coalesce(old.raw_user_meta_data ->> 'display_name',''))
     or (coalesce(new.raw_user_meta_data ->> 'full_name','')   is distinct from coalesce(old.raw_user_meta_data ->> 'full_name',''))
  then
    v_display_name := coalesce(
      (new.raw_user_meta_data ->> 'display_name'),
      (new.raw_user_meta_data ->> 'full_name'),
      split_part(new.email, '@', 1),
      'user-' || left(new.id::text, 8)
    );

    update public.users
       set display_name = v_display_name
     where id = new.id;
  end if;

  return new;
end;
$$;

-- Keep display_name synced on later auth-metadata changes
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update on auth.users
for each row execute function public.handle_updated_auth_user();

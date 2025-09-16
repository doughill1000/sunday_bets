-- Function: insert a row into public.users when a new auth.users row is created
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  -- Choose a safe, non-null display_name:
  --   1) raw_user_meta_data.display_name
  --   2) raw_user_meta_data.full_name
  --   3) email local-part
  --   4) fallback based on uuid
  v_display_name := coalesce(
    (new.raw_user_meta_data ->> 'display_name'),
    (new.raw_user_meta_data ->> 'full_name'),
    split_part(new.email, '@', 1),
    'user-' || left(new.id::text, 8)
  );

  insert into public.users (id, display_name, role)
  values (new.id, v_display_name, 'player')
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Optional: keep display_name in sync if auth metadata later changes
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

-- Clean up existing triggers if re-run
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_updated on auth.users;

-- Fire AFTER INSERT on auth.users to mirror into public.users
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Optional: keep display_name synced on metadata changes
create trigger on_auth_user_updated
after update on auth.users
for each row execute function public.handle_updated_auth_user();
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

-- Fire AFTER INSERT on auth.users to mirror into public.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Returns the final_week_unlimited_allin gameplay flag.
-- SECURITY DEFINER so lock_pick (SECURITY INVOKER) can read settings
-- without granting authenticated users broad access to the settings table.
create or replace function public._get_final_week_unlimited_allin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select s.final_week_unlimited_allin from public.settings s where s.id = true),
    true
  );
$$;

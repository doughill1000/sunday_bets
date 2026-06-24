do $$
begin
  create type public.group_membership_status as enum ('active', 'pending');
exception when duplicate_object then null;
end $$;

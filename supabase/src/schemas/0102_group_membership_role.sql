do $$
begin
  create type public.group_membership_role as enum ('commissioner', 'member');
exception when duplicate_object then null;
end $$;

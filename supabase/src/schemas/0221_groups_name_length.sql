-- Bound group names from above; the table already rejects blank names
-- (groups_name_not_blank in 0208_groups.sql). Defense in depth: public.create_group
-- validates the same bound and is currently the only insert path, but the cap
-- belongs with the data so any future write path inherits it.
alter table public.groups
  drop constraint if exists groups_name_max_len;
alter table public.groups
  add constraint groups_name_max_len check (length(btrim(name)) <= 60);

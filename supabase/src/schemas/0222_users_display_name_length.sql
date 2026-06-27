-- Cap display_name at 40 trimmed characters.
-- Defense in depth: the auth triggers (handle_new_auth_user, handle_updated_auth_user)
-- clamp via left(btrim(...), 40) before writing, so any future write path inherits the
-- constraint at the data layer.
alter table public.users
  drop constraint if exists users_display_name_max_len;
alter table public.users
  add constraint users_display_name_max_len check (length(btrim(display_name)) <= 40);

do $$ begin
  create type public.cover_side as enum ('home','away','push');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.side_enum as enum ('home','away');
exception when duplicate_object then null; end $$;

 do $$ begin
  create type public.weight_enum as enum ('L','M','H','A');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.side_enum as enum ('home','away');
exception when duplicate_object then null; end $$;
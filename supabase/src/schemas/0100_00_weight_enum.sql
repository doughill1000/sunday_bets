do $$ begin
  create type public.weight_enum as enum ('L','M','H','A');
exception when duplicate_object then null; end $$;

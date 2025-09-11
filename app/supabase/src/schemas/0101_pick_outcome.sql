do $$ begin
  create type public.pick_outcome as enum ('win','loss','push');
exception when duplicate_object then null end $$;

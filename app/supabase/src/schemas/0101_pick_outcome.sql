do $$
begin
  create type public.pick_outcome as enum ('win','loss','push','missed');
exception
  when duplicate_object then
    begin
      -- If enum exists but 'missed' isn't there yet, add it.
      perform 1
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      where t.typname = 'pick_outcome' and e.enumlabel = 'missed';
      if not found then
        alter type public.pick_outcome add value 'missed';
      end if;
    end;
end$$;
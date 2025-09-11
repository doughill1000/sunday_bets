create or replace function public.weight_points(p_weight text)
returns int
language sql
immutable
as $$
  select case upper(p_weight)
    when 'L' then 1 when 'M' then 3 when 'H' then 5 when 'A' then 10 else 0 end
$$;

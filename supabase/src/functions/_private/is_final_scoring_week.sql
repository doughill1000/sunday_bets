-- _is_final_scoring_week: the single definition of "this round is the season finale" --
-- the round the unlimited-All-In exemption (settings.final_week_unlimited_allin) applies to.
--
-- ADR-0016 boundary 2: whether a round counts is decided exclusively by `is_scoring`, never
-- by the sign of `week_number`. The finale is therefore the highest `week_number` among the
-- season's SCORING weeks. lock_pick and lock_pick_all_groups both used a bare
-- `max(week_number)` over every week, which is correct only while non-scoring rounds happen
-- to be numbered negatively; the practice round ADR-0016 explicitly provides for
-- (`is_scoring=false` with a non-negative `week_number`) would have stolen the exemption from
-- the real final week and handed it to a round worth nothing (#792).
--
-- One function rather than the same predicate mirrored into each caller: the two RPCs carried
-- identical copies and drifted together, so the rule now changes in one place -- the same
-- shape as _participation_start (ADR-0037) and the #789 recap gate.
--
-- Returns false -- never null -- for an unknown week, for a non-scoring round, and for a
-- season with no scoring weeks at all. Callers use the result directly inside an `and`, where
-- a null would make the whole guard null and silently switch the once-per-week All-In rule
-- off, so false (enforce the rule) is the safe direction.
--
-- SECURITY DEFINER on purpose, matching _participation_start: which week is the finale is a
-- gameplay-fairness fact, and a caller reading under RLS must not be able to resolve a
-- different finale than the rule intends. Callers are SECURITY INVOKER, so `authenticated`
-- needs the explicit EXECUTE grant below (ADR-0011 revokes PUBLIC).
create or replace function public._is_final_scoring_week(p_week_id int)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select w.is_scoring
         and w.week_number = (
           select max(w2.week_number)
           from public.weeks w2
           where w2.season_id = w.season_id
             and w2.is_scoring
         )
      from public.weeks w
      where w.id = p_week_id
    ),
    false
  );
$$;

grant execute on function public._is_final_scoring_week(int)
  to authenticated, service_role;

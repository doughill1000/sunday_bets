- **#724** The read side now honours the participation boundary too: the who's-picked board no
  longer counts a league against a slate it is not competing for yet, and the League ▸ Weekly
  grid no longer paints a member as having missed games played before they joined. The
  completeness surfaces gained the matching guard — a game nobody was participating in owes no
  settlement, so the reconcile sweep and week-completion check no longer treat such a week as
  permanently unsettled. Full surface-by-surface inventory in `docs/audits/`. files:
  `supabase/src/functions/`, `src/lib/domain/`, `src/lib/server/db/queries/`,
  `src/lib/utils/` · governed by ADR-0037.

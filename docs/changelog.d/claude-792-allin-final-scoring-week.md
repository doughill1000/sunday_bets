- **#792** Anchor the unlimited-All-In exemption on the last **scoring** week — both pick
  RPCs resolved the season finale over every week regardless of whether it counted, so a
  non-scoring round numbered above the real final week (which ADR-0016 explicitly allows)
  would have taken the exemption off the finale and handed it to a round worth nothing. The
  rule now lives in one shared helper both call sites use. Governed by ADR-0016. files:
  `supabase/src/functions/_private/` · `supabase/src/functions/picks/`

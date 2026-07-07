# Agent Context Recipes

Recipes are **end-to-end, multi-pack walkthroughs** — a vertical slice of a whole
feature, from the database up through the route. They complement the [context
packs](../README.md), which own the _rules_ for a single topic (auth, database, ui,
testing). A recipe strings those rules together into an _ordered procedure_ for a
recurring kind of change, so an agent building the Nth instance of a pattern doesn't
have to re-derive the slice by reading a dozen files.

## The same link-not-copy rule applies

A recipe **summarizes and links** to the owning pack or ADR at each step — it never
restates the rules. If a recipe and a pack disagree, the pack (and its linked
canonical source) wins. A recipe is a checklist with pointers, not a second copy of
the rules it points at. Keep steps terse; put the "why" in the linked pack/ADR.

## Recipes

| Recipe                                                           | The slice it covers                                                                                                                                                         |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [materialized-read-surface.md](materialized-read-surface.md)     | A read-only surface backed by aggregated/materialized data: base matview → refresh → migration/types → pgTAP → query/readModel → client cache → API route → page trio → nav |
| [per-user-profile-preference.md](per-user-profile-preference.md) | A per-user setting on `public.users` that rides the cached auth-context profile: column → hooks.server.ts → app.d.ts → /api/profile → Settings UI                           |

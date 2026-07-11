# Agent Context Packs

Targeted deep-reference for the areas agents most often get wrong or must re-discover.
Each pack owns its topic's agent-facing detail and **links to canonical sources** —
it does not copy them. This keeps the system single-source: the pack is wrong only if
it contradicts something here; the linked canonical source is always authoritative.

See `AGENTS.md` for the top-level index, conventions, and delivery workflow.

## Packs

| Pack                                 | What it covers                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| [auth.md](auth.md)                   | Cookie sessions, iOS PWA constraint, service-role vs anon, admin boundary         |
| [database.md](database.md)           | Migration flow, generated files, RLS/grants/pgTAP rules, PR review guidance       |
| [ui.md](ui.md)                       | Vendored shadcn-svelte restrictions, Svelte 5 runes, Tailwind, demo seed          |
| [design-system.md](design-system.md) | Token vocabulary (color/type/spacing/elevation/motion), selection-tier, hex guard |
| [testing.md](testing.md)             | Four test layers, CI gate, lint-not-in-CI gotcha, mock fragility                  |

## Recipes

Where packs own a single topic's _rules_, [recipes](recipes/README.md) are
end-to-end, multi-pack _procedures_ — ordered checklists for a recurring kind of
change that spans several packs. They follow the same link-not-copy rule below.

- [recipes/materialized-read-surface.md](recipes/materialized-read-surface.md) — a
  read-only surface backed by a matview refreshed on grading (DB → query → cache →
  route → nav).

## The link-not-copy rule

When a pack needs to reference a fact that lives elsewhere (README migration flow,
`AGENTS.md` auth section, an ADR), it summarizes in one line and links. It does not
restate. This means:

- `README.md` owns the hash-ledger migration walkthrough.
- `docs/adr/` owns durable technical decisions.
- `AGENTS.md` owns the concise conventions index.
- These packs own per-topic agent-facing depth.

New edits to a pack must follow the same rule: add depth, don't copy.

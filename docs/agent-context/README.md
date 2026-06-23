# Agent Context Packs

Targeted deep-reference for the areas agents most often get wrong or must re-discover.
Each pack owns its topic's agent-facing detail and **links to canonical sources** —
it does not copy them. This keeps the system single-source: the pack is wrong only if
it contradicts something here; the linked canonical source is always authoritative.

See `AGENTS.md` for the top-level index, conventions, and delivery workflow.

## Packs

| Pack                       | What it covers                                                              |
| -------------------------- | --------------------------------------------------------------------------- |
| [auth.md](auth.md)         | Cookie sessions, iOS PWA constraint, service-role vs anon, admin boundary   |
| [database.md](database.md) | Migration flow, generated files, RLS/grants/pgTAP rules, PR review guidance |
| [ui.md](ui.md)             | Vendored shadcn-svelte restrictions, Svelte 5 runes, Tailwind, demo seed    |
| [testing.md](testing.md)   | Four test layers, CI gate, lint-not-in-CI gotcha, mock fragility            |

## The link-not-copy rule

When a pack needs to reference a fact that lives elsewhere (README migration flow,
`AGENTS.md` auth section, an ADR), it summarizes in one line and links. It does not
restate. This means:

- `README.md` owns the hash-ledger migration walkthrough.
- `docs/adr/` owns durable technical decisions.
- `AGENTS.md` owns the concise conventions index.
- These packs own per-topic agent-facing depth.

New edits to a pack must follow the same rule: add depth, don't copy.

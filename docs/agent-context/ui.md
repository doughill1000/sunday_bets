# UI context pack

> See `AGENTS.md` § "Repo map" for component directory layout. This pack owns
> the agent-facing rules for the UI layer. For the mobile-first _interaction_
> principles (390px canvas, one-pattern-per-job, disclosure depth) see
> [`../DESIGN.md`](../DESIGN.md); for the _token_ vocabulary see
> [`design-system.md`](design-system.md).

## Vendored shadcn-svelte — do not hand-edit

`src/lib/components/ui/` contains vendored [shadcn-svelte](https://shadcn-svelte.com/)
components. They are **eslint-ignored** and must never be hand-edited:

- Edits are silently overwritten the next time the component is re-added via
  `npx shadcn-svelte@latest add <component>`.
- ESLint rules (including `no-explicit-any`) are disabled for this directory.

To add a new shadcn-svelte component: `npx shadcn-svelte@latest add <component-name>`.
To customise a component: copy it out of `ui/` into `src/lib/components/` and modify
the copy — do not modify the original in `ui/`.

## Svelte 5 runes

The repo targets **Svelte 5 runes** idioms. Match the style of the file you're editing:

- State: `$state()`, not `let x = ...` with reactive declarations.
- Derived: `$derived()`, not `$: x = ...`.
- Effects: `$effect()`, not `$: { ... }` blocks.
- Props: `let { prop } = $props()`, not `export let prop`.
- Component events: callback props (`onchange`, `onclick`), not `createEventDispatcher`.

Do not mix runes and legacy Svelte 4 idioms in the same component. If you encounter
a legacy file, leave its idiom intact unless the task explicitly asks for a migration.

## Tailwind 4

The project uses **Tailwind CSS v4**. Key differences from v3:

- Configuration lives in `src/app.css` (CSS-first config), not `tailwind.config.js`.
- The `@theme` directive defines design tokens inline in CSS.
- Do not create or modify `tailwind.config.js` — it does not exist.

## UI states and demo seed

The app has four meaningful pick states that affect UI rendering:
`open` (can still pick) · `selected` (pick placed, game not started) ·
`locked` (game in progress) · `missed` (game started, no pick placed).

To exercise all four states locally without waiting for real game times:

```sh
pnpm db:reset:demo
```

This seeds the local Supabase instance with a demo dataset covering all pick states.
Use it before testing any component that branches on pick state.

## Validation for changes here

```sh
pnpm lint       # Prettier + ESLint (shadcn-svelte ui/ is excluded)
pnpm check      # svelte-check — catches type errors in .svelte files
pnpm test:unit  # unit tests for any pure logic extracted from components
```

For visual regression, run the dev server and exercise the golden path manually:

```sh
pnpm db:reset:demo
pnpm dev
# open http://localhost:5173 and verify the picks grid renders all four states
```

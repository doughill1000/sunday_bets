- **PR #629** Fix the black-box brand mark behind the sign-in logo and header — the
  in-app Hotshot lockup and mark SVGs baked in a charcoal card that showed as a black box
  on the sign-in card and the Parchment light navbar. The marks are now transparent and
  ride a theme-aware charcoal chip that only appears on the light theme (where the cream
  laces would otherwise wash out), and the oversized navbar mark was right-sized. files:
  `static/hotshot-lockup.svg` · `static/logo-mark.svg` · `src/app.css` (`.brand-chip`) ·
  `src/routes/auth/+page.svelte` · `src/lib/components/app-header/AppHeader.svelte`

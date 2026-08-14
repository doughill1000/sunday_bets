- **#818** The Tuesday results push now opens the week it is reporting on. It previously
  linked to a bare `/week`, which by send time already meant the next, not-yet-played week
  — so the one notification whose job is "here is your week" landed on an empty page. The
  link now names its season and week outright, the way the AI recap push already did.
  routes: `/week` · files: `src/lib/server/notifications.ts`

- **#867** The `/league` trophy-room door is evergreen. It used to render only when the
  league had a reigning champion, so the room's one first-paint entrance was dark for the
  whole in-season stretch and forever for a league that had never finished a season —
  exactly when the room is most alive. It is now present all season and speaks from the
  viewed season's data-state: the crown when there is one, otherwise the freshest thing the
  room has settled, degrading to a plain "Trophy room" way in. The door and the champion
  strip also lose their gold card — gold survives on the crown and the "· Champion" label —
  and a brass count on the door and the Honors tab says when the room holds something this
  device hasn't seen. `HonorsStrip.svelte` · `league/+page.svelte` · `src/lib/ui/honorsDoor.ts`
  · `docs/DESIGN.md` (ADR-0030; the principle-2 note and the crowned-season rule both
  revised).

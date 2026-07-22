- **#725** Commissioners can now set when their league's competition starts — "this week, from
  now" by default or a future week — both when creating a league and from the manage console,
  where the control locks once the first game kicks off. A midseason joiner sees which week
  they're in from before joining, and weeks before a member joined read as a neutral "not in
  yet" on the Weekly grid rather than a miss. Pick reminders now respect the same boundary, so a
  not-yet-started league stops nagging its members. Closes out ADR-0037 (rulings 4 & 5). files:
  `supabase/src/functions/groups/`, `src/routes/join/`, `src/routes/(app)/league/manage/`,
  `src/lib/server/notifications.ts`.

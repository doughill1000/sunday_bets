- **#770** Weekly hardware ties mint co-winners — when players genuinely tied on a weekly
  award's stat, the award silently went to whoever sorted first alphabetically. Every
  weekly-award selector now returns all tied holders, so a shared Game Ball lists both names
  on the week's tile and banks a full award on each player's season shelf. A tie between two
  of one player's own picks still counts once, and the flat-week rules are unchanged: nobody
  is the Donkey, everybody gets the Game Ball. Awards stay derived on read, so past seasons
  re-derive with co-winners on their own. surfaces: `/recap` · `/league` Week tab ·
  `/demo/recap` · files: `weeklyAwards` domain module · `WeeklyHardware`

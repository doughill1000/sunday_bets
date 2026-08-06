- **#787** Declutter the picks board's all-locked resting state — the non-scoring notice
  drops to a caption, the redundant "You're all set" card and the empty All-Ins card no
  longer render, and "Who's picked" collapses to a single line, so the committed pick
  reaches the player above the fold. On a committed row `Locked` is now flat status text
  rather than a filled badge, leaving `Unlock` as the only pressable element. Presentation
  only — ADR-0019 counts-only status and ADR-0023 All-In reveal are unchanged. files:
  `src/lib/components/picks/` · ADR-0030

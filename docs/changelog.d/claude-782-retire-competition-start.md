- **#782** Retired the competition-start controls: joining is now the only participation
  boundary you can set. The commissioner console no longer carries a "Competition start"
  card that could only ever read "Play is underway", and creating a league no longer asks
  which week play begins — it begins right away, and games before you joined never count
  against you. Grading and settled history are unchanged. adr:
  `docs/adr/0039-joining-is-the-only-participation-boundary.md` (supersedes ADR-0037
  rulings 4 and 5) · routes: `/league/manage` · `/join`

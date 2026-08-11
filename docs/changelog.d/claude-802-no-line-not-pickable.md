- **#802** A game whose line hasn't been posted yet no longer pretends to be pickable. The
  card used to let you choose a team and a weight and light up "Lock in", only for the server
  to refuse the pick and leave an error inviting you to retry something guaranteed to fail —
  which is what the whole board looked like in the hours after a week went active. Such a game
  now reads as a state ("Line not posted yet") rather than a value, its controls are inactive,
  and it becomes pickable on its own once the line lands. A pick'em is a real line and stays
  fully pickable. The server-side guard is unchanged; this is the UI agreeing with it. adr:
  `docs/adr/0040-unpickable-games-cannot-cost-points.md`

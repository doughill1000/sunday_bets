- **#768** Season Wrapped has a way out — `/wrapped` was reachable only from the `/league`
  honors card and the Wrapped flash, then left the player with no exit but the browser back
  button, while its sibling `/recap` had carried one since #631. Both Wrapped surfaces now
  lead with a back link and wear the recap archive's header anatomy (back link → icon +
  title → supporting line → season control), so the two CTA-reached season-story pages read
  as one kind of screen. The link is extracted as a shared `BackLink` per DESIGN.md's
  second-consumer rule, replacing the three hand-rolled `← League` anchors, and the recap
  pages drop the redundant padding that had them insetting further than Wrapped. routes:
  `/wrapped` · `/demo/wrapped` · `/recap` · `/demo/recap` · `/league/manage` · files:
  `BackLink` (new) · `docs/DESIGN.md`

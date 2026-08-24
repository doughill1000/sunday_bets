- **#849** AI voice moves to a newer, cheaper model — the Commissioner now speaks through
  `openai/gpt-5.6-sol` instead of `openai/gpt-5.4`, cutting the cost of a weekly recap by
  roughly a third with no change to the voice or the deterministic fallback. The spend cap
  now measures what the gateway actually billed rather than a local price list that had
  drifted far enough to let several times the intended budget through. Governed by ADR-0008,
  whose Follow-up records the new default.

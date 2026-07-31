- **PR #785** Keep the free-tier QA/staging Supabase project (`SUNDAY_BETS_QA`, ref
  `eoncckeqqogezoftooix`) awake with a scheduled ping so it stops auto-pausing after 7
  days of inactivity during quiet release stretches. Runs a trivial `select 1` against
  `SUPABASE_STAGING_DB_URL` twice weekly (Mon/Thu). workflow: `cron-keepalive-qa.yml`

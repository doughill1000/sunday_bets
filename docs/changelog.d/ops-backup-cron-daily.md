- **PR #856** Backup cron flipped weekly → daily for the NFL 2026 season — the
  off-platform Supabase dump now runs at 08:00 UTC every day, tightening RPO from a
  week to a day while picks are live. files: `.github/workflows/cron-backup.yml` ·
  `docs/runbooks/backup-restore-drill.md` · ADR-0010 (fragment rekeyed by PR #859)

- **#604** Prove the Supabase backup is restorable (restore drill) — restored the latest
  off-platform prod dump into a scratch database and reconciled row counts against prod with
  zero unexplained drift, so the ADR-0010 backups are proven recoverable, not merely
  produced. files: `docs/runbooks/backup-restore-drill.md` ·
  `.github/workflows/cron-backup.yml` · ADR-0010

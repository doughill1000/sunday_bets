- **#625** Add a `concurrency:` guard to the `grade` cron so overlapping runs queue
  instead of racing — defense in depth alongside the refresh-once race fix in #622.
  files: `.github/workflows/cron-grade.yml`

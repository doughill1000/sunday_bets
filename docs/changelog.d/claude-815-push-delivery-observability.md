- **#815** Push notifications now report what was delivered, not just what was attempted.
  Every cron notification summary counts the pushes that actually reached a device
  separately from the ones tried, so a total delivery outage no longer logs as a healthy
  run. Each `notification_log` row records its delivery result, and a notification that
  reached nobody is retried on the next run instead of silently consuming its one-time
  dedup slot forever; the admin test card now tells "you have no subscriptions" apart from
  "every subscription rejected the push".

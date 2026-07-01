-- ---------------------------------------------------------------------------
-- users.notification_prefs
-- Per-user notification settings: a master switch plus per-trigger config.
-- Added as a separate ALTER so the legacy users table source stays untouched.
--   { "enabled": bool,
--     "pick_reminders": bool,
--     "ai_recap": bool,
--     "line_shift": { "enabled": bool, "threshold": number } }
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists notification_prefs jsonb not null default
    '{"enabled": false, "pick_reminders": true, "ai_recap": true, "line_shift": {"enabled": true, "threshold": 2}}'::jsonb;

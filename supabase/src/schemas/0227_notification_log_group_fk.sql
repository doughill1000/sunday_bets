-- notification_log.group_id FK, added here (not inline in 0206_notification_log.sql)
-- because public.groups does not exist until 0208_groups.sql.
alter table public.notification_log
  drop constraint if exists notification_log_group_id_fkey;

alter table public.notification_log
  add constraint notification_log_group_id_fkey
  foreign key (group_id)
  references public.groups(id)
  on delete cascade;

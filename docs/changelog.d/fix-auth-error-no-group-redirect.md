- **PR #610** Fix the no-group redirect and clean up dev-facing copy on the auth error
  page — the six routes that bounced a groupless user to `/auth/error` now send them to
  `/join` (the page already built for that state), and `/auth/error` itself drops a
  leftover Supabase-setup line and unifies its button label, staying focused on
  magic-link troubleshooting.

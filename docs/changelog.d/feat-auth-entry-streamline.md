- **PR #611** Streamline the sign-up entry path — "Continue with Google" now renders in
  sign-up mode (not just sign-in), and the post-auth `next` is threaded through email
  confirmation so an invitee who signs up with email/password returns to their invite
  instead of getting bounced to `/join` with it un-redeemed. Also keeps the typed email
  across signin↔signup switches and adds a show/hide password toggle. routes: `/auth`,
  `/auth/confirm`

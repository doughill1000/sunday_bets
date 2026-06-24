// Credentials for the main E2E sign-in user. Created in global-setup via the
// GoTrue admin API (seed.sql's hand-written auth.users rows can't password-login
// — they lack auth.identities rows and leave token columns NULL).
export const E2E_USER = {
  email: 'e2e@example.com',
  password: 'e2e-password-123',
  displayName: 'e2e'
};

// Dedicated user for the password-reset E2E flow.  Kept separate so the reset
// test can change the password without breaking auth.setup.ts on the next run.
export const E2E_RESET_USER = {
  email: 'e2e-reset@example.com',
  password: 'e2e-reset-password-123',
  displayName: 'e2e-reset'
};

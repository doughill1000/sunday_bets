# Runbook — iOS PWA install → push verification (on device)

**Purpose:** prove the iOS 16.4+ install → notification-permission → push-delivery
path works end-to-end on a physical iPhone. This path is uncoverable in CI (real
Safari install, real APNs delivery), so a regression would otherwise ship silently.
Run this whenever the engagement banner, service worker, or push wiring changes, and
as the manual acceptance step for issue #380.

**Scope:** the iOS happy path plus a light regression spot-check of the Android
install prompt. It does not exercise `notif-denied` recovery or desktop flows.

## Preconditions

- A physical **iPhone running iOS 16.4 or later** (web-push on iOS requires 16.4+).
- **Safari** (iOS only registers Home Screen web apps installed from Safari).
- A deployed build reachable over **HTTPS** (a Vercel preview or prod URL — service
  workers and web-push do not run over plain HTTP, and `localhost` tunnels are not
  reliable for the install path).
- A **signed-in** Sunday Bets user on that build (the banner only renders for a
  logged-in `user`).
- **VAPID keys** configured on the target environment and `/api/push/subscribe`
  reachable (already shipped with #92).
- Admin access to **`/admin`** for sending a test push.
- Start from a clean slate: the app is **not** already on the Home Screen, and the
  install banner has **not** been dismissed on this device (clear Safari website data
  for the site, or use a device where it has never been dismissed — dismissal is
  persisted in `localStorage` under `sb:pwa:install-dismissed:v1`).

## Steps

### 1. See the iOS install banner

1. Open the site in **Safari** and sign in.
2. Confirm the engagement banner reads **"Add Sunday Bets to your Home Screen"** with
   copy: _Tap **Share** □↑ → **Add to Home Screen** in Safari._
3. **Confirm the Share glyph renders** immediately after the word "Share" and matches
   the icon in Safari's toolbar (a square with an up arrow). Toggle **Settings →
   Display & Brightness → Light / Dark** and reload — verify the glyph stays legible
   in **both** themes (it inherits `text-muted-foreground`, no hard-coded color).

### 2. Install to the Home Screen

1. Tap Safari's **Share** button (the □↑ glyph the banner points at).
2. Choose **Add to Home Screen**, then **Add**.
3. Confirm the Sunday Bets icon appears on the Home Screen.

### 3. Launch standalone and reach the notification step

1. Launch the app from the **Home Screen icon** (not Safari) so it opens in
   standalone display mode.
2. Sign in if prompted.
3. **Confirm the `notif-enable` step appears:** banner reads **"Enable push
   notifications"** with an **Enable** button. (In standalone the install step is
   resolved, so the banner advances to the notification step.)

### 4. Grant permission and register the subscription

1. Tap **Enable**.
2. Accept the iOS **"Allow Notifications"** system prompt.
3. Confirm the banner dismisses / advances (permission is now `granted`).
4. **Verify a subscription was created:** the client POSTs to
   **`/api/push/subscribe`** on grant. Confirm either via the network tab (Safari
   remote debugging against a Mac) **or** by checking a new row for this device in
   `push_subscriptions` for the signed-in user.

### 5. Deliver a test push

1. On any device, open **`/admin`** and send a **test push** to the signed-in user.
2. **Confirm the notification is received** on the iPhone (banner/lock-screen alert),
   and that tapping it opens the installed app.

### 6. Regression spot-check — Android install prompt

1. On an Android device in Chrome, sign in and confirm the **"Install Sunday Bets"**
   banner still shows an **Install** button (the `beforeinstallprompt`-backed
   `install-prompt` step), and that installing still works. No change was made to this
   path; this is a smoke check only.

### 7. Dismissal persistence

1. Back in iOS Safari (fresh device state, before install), **dismiss** the iOS
   install banner with the **✕**.
2. **Reload** the page and confirm the banner does **not** re-appear (dismissal is
   persisted in `localStorage` under `sb:pwa:install-dismissed:v1`).

## Pass criteria

- [ ] Share glyph renders beside "Share" and is legible in light **and** dark themes.
- [ ] After Home Screen install, the standalone app surfaces the `notif-enable` step.
- [ ] Granting permission registers a subscription via `/api/push/subscribe`.
- [ ] A `/admin` test push is received on the physical iPhone (iOS 16.4+).
- [ ] Android `install-prompt` still works (no regression).
- [ ] Dismissing the iOS banner persists across reload (no re-nag).

## Notes / gotchas

- iOS only delivers web-push to apps **installed to the Home Screen** and only on
  **16.4+**; testing in the Safari tab (non-standalone) will not receive push.
- iOS silently ignores the `Notification` permission request unless it originates from
  a **user gesture** — always tap **Enable**, never trigger it programmatically.
- If the banner never appears, confirm the site data was cleared (a prior dismissal or
  an existing Home Screen install both suppress it) and that the user is signed in.

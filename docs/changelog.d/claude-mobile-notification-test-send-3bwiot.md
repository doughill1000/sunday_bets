- **PR #841** Fix fixed bottom chrome (tab bar, feedback button) stranding mid-screen on
  iOS Safari after momentum scrolling — hoists each fixed overlay onto its own GPU
  compositing layer via `transform: translateZ(0)` so Safari repositions it every frame
  instead of leaving a stale painted copy. files: `BottomTabBar.svelte` ·
  `FeedbackWidget.svelte` · `DemoBottomTabBar.svelte`

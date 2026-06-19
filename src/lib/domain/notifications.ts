// Pure notification rules + types. Safe to import from both client and server
// (mirrors the pure-rules convention in src/lib/domain/rules.ts).

export type LineShiftPrefs = {
  enabled: boolean;
  /** Minimum absolute line movement (in points) that triggers an alert. */
  threshold: number;
};

export type NotificationPrefs = {
  /** Master switch — when false, no notifications of any kind are sent. */
  enabled: boolean;
  pick_reminders: boolean;
  line_shift: LineShiftPrefs;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: false,
  pick_reminders: true,
  line_shift: { enabled: true, threshold: 2 }
};

/** Shape delivered to the service worker and shown via showNotification(). */
export type PushPayload = {
  title: string;
  body: string;
  /** Where notificationclick should navigate. Defaults to '/' in the SW. */
  url?: string;
  /** Coalescing tag so repeat alerts for the same thing replace each other. */
  tag?: string;
};

/**
 * Coerce the free-form jsonb `users.notification_prefs` into a fully-populated,
 * defensively-defaulted NotificationPrefs. Never throws.
 */
export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  const base = DEFAULT_NOTIFICATION_PREFS;
  if (!raw || typeof raw !== 'object') {
    return { ...base, line_shift: { ...base.line_shift } };
  }
  const obj = raw as Record<string, unknown>;
  const lsRaw =
    obj.line_shift && typeof obj.line_shift === 'object'
      ? (obj.line_shift as Record<string, unknown>)
      : {};

  return {
    enabled: typeof obj.enabled === 'boolean' ? obj.enabled : base.enabled,
    pick_reminders:
      typeof obj.pick_reminders === 'boolean' ? obj.pick_reminders : base.pick_reminders,
    line_shift: {
      enabled: typeof lsRaw.enabled === 'boolean' ? lsRaw.enabled : base.line_shift.enabled,
      threshold:
        typeof lsRaw.threshold === 'number' && lsRaw.threshold > 0
          ? lsRaw.threshold
          : base.line_shift.threshold
    }
  };
}

/**
 * Spread value re-expressed relative to the home team, so two lines stored
 * against different reference teams can be compared directly.
 * (A spread of -3 for the away team is +3 for the home team.)
 */
export function spreadRelativeToHome(teamId: number, value: number, homeTeamId: number): number {
  return teamId === homeTeamId ? value : -value;
}

/** Absolute points the active line has moved since the user's snapshot. */
export function lineMovementPoints(args: {
  homeTeamId: number;
  lockedTeamId: number;
  lockedValue: number;
  currentTeamId: number;
  currentValue: number;
}): number {
  const locked = spreadRelativeToHome(args.lockedTeamId, args.lockedValue, args.homeTeamId);
  const current = spreadRelativeToHome(args.currentTeamId, args.currentValue, args.homeTeamId);
  return Math.abs(current - locked);
}

/**
 * Decide whether a line-shift alert should fire. Returns false when the feature
 * is off, the move is under threshold, or we already alerted this user for this
 * game at the current line value (dedupe across repeated sync runs).
 */
export function shouldNotifyLineShift(args: {
  movement: number;
  threshold: number;
  lineShiftEnabled: boolean;
  /** Home-relative line value we last notified about, or null if never. */
  lastNotifiedTo: number | null;
  /** Home-relative current line value. */
  currentTo: number;
}): boolean {
  if (!args.lineShiftEnabled) return false;
  if (!(args.threshold > 0)) return false;
  if (args.movement < args.threshold) return false;
  if (args.lastNotifiedTo !== null && args.lastNotifiedTo === args.currentTo) return false;
  return true;
}

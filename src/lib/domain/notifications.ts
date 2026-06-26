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
  /** Post-grading recap of the user's week (wins/losses/net). */
  results_recap: boolean;
  line_shift: LineShiftPrefs;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: false,
  pick_reminders: true,
  results_recap: true,
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
    results_recap: typeof obj.results_recap === 'boolean' ? obj.results_recap : base.results_recap,
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
 * is off, the move is under threshold, or this user was already alerted for this
 * game recently (the once-per-pick-per-day cap).
 */
export function shouldNotifyLineShift(args: {
  movement: number;
  threshold: number;
  lineShiftEnabled: boolean;
  /** True if a line-shift alert was already sent for this pick within the cap window. */
  recentlyNotified: boolean;
}): boolean {
  if (!args.lineShiftEnabled) return false;
  if (!(args.threshold > 0)) return false;
  if (args.movement < args.threshold) return false;
  if (args.recentlyNotified) return false;
  return true;
}

/** Tally of a single user's settled picks for a week. */
export type RecapTally = {
  wins: number;
  losses: number;
  pushes: number;
  missed: number;
  /** Sum of points_delta across the week's settlements. */
  net: number;
};

/**
 * One-line push body summarizing a user's week. Pure so it can be unit-tested
 * without a database. Push/missed clauses are omitted when zero.
 *   e.g. "3-1 with 1 push · +7 points this week. Tap for standings."
 */
export function formatRecapBody(t: RecapTally): string {
  let record = `${t.wins}-${t.losses}`;
  const extras: string[] = [];
  if (t.pushes > 0) extras.push(`${t.pushes} push${t.pushes === 1 ? '' : 'es'}`);
  if (t.missed > 0) extras.push(`${t.missed} missed`);
  if (extras.length > 0) record += ` with ${extras.join(' and ')}`;

  const sign = t.net > 0 ? '+' : '';
  const points = `${sign}${t.net} point${Math.abs(t.net) === 1 ? '' : 's'} this week`;

  return `${record} · ${points}. Tap for standings.`;
}

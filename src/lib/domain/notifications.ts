// Pure notification rules + types. Safe to import from both client and server
// (mirrors the pure-rules convention in src/lib/domain/rules.ts).

export type LineShiftPrefs = {
  enabled: boolean;
};

/**
 * Fixed line-movement alert threshold (#693 dropped the per-user points knob
 * — the casual room doesn't need a bettor's configuration surface).
 */
export const LINE_SHIFT_THRESHOLD_POINTS = 2;

export type NotificationPrefs = {
  /** Master switch — when false, no notifications of any kind are sent. */
  enabled: boolean;
  pick_reminders: boolean;
  /** Post-grading recap of the user's week (wins/losses/net). */
  results_recap: boolean;
  /** "Recap ready" push once the AI recap for a group/week is generated (#302). */
  ai_recap: boolean;
  line_shift: LineShiftPrefs;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: false,
  pick_reminders: true,
  results_recap: true,
  ai_recap: true,
  line_shift: { enabled: true }
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
  // `threshold` may still be present in older stored jsonb (#693 dropped the
  // knob) — deliberately ignored rather than parsed.
  const lsRaw =
    obj.line_shift && typeof obj.line_shift === 'object'
      ? (obj.line_shift as Record<string, unknown>)
      : {};

  return {
    enabled: typeof obj.enabled === 'boolean' ? obj.enabled : base.enabled,
    pick_reminders:
      typeof obj.pick_reminders === 'boolean' ? obj.pick_reminders : base.pick_reminders,
    results_recap: typeof obj.results_recap === 'boolean' ? obj.results_recap : base.results_recap,
    ai_recap: typeof obj.ai_recap === 'boolean' ? obj.ai_recap : base.ai_recap,
    line_shift: {
      enabled: typeof lsRaw.enabled === 'boolean' ? lsRaw.enabled : base.line_shift.enabled
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

/** Which way a line move cuts for the user who picked a side (#731). */
export type LineShiftDirection = 'against' | 'favorable' | 'none';

/**
 * The fresh jump between two synced line rows, expressed relative to the user's
 * picked team (#731). The comparison basis is the previous synced row, not the
 * pick-time locked line — the locked pick only supplies which side is yours.
 * A picked-team-relative spread moving up (toward/past the underdog side, e.g.
 * -1 → +2) means the market backed off your side: 'against'. Moving down
 * (Bills -1 → Bills -3.5) means the market agrees with you: 'favorable'.
 */
export function lineShiftForPick(args: {
  pickedTeamId: number;
  previousTeamId: number;
  previousValue: number;
  currentTeamId: number;
  currentValue: number;
}): { points: number; direction: LineShiftDirection } {
  const previous =
    args.previousTeamId === args.pickedTeamId ? args.previousValue : -args.previousValue;
  const current = args.currentTeamId === args.pickedTeamId ? args.currentValue : -args.currentValue;
  const delta = current - previous;
  return {
    points: Math.abs(delta),
    direction: delta > 0 ? 'against' : delta < 0 ? 'favorable' : 'none'
  };
}

/**
 * Decide whether a line-shift alert should fire (#731: recent-jump,
 * against-you-only). Returns false when the feature is off, the jump is not
 * fresh (it happened before the pregame window — a move that settled early is
 * old news, not urgency), the move favors the user's side, the fresh jump is
 * under the fixed threshold, or this user was already alerted for this game
 * recently (the once-per-pick-per-day cap).
 */
export function shouldNotifyLineShift(args: {
  /** Fresh-jump magnitude versus the previous synced row, in points. */
  movement: number;
  direction: LineShiftDirection;
  /** True when the current row was synced inside the pregame window (the jump is fresh). */
  freshJump: boolean;
  lineShiftEnabled: boolean;
  /** True if a line-shift alert was already sent for this pick within the cap window. */
  recentlyNotified: boolean;
}): boolean {
  if (!args.lineShiftEnabled) return false;
  if (!args.freshJump) return false;
  if (args.direction !== 'against') return false;
  if (args.movement < LINE_SHIFT_THRESHOLD_POINTS) return false;
  if (args.recentlyNotified) return false;
  return true;
}

/** One qualifying line move feeding the merged pregame push (#731). */
export type PregameLineShift = {
  /** Short display name of the user's picked side (teams.short_name, e.g. "Bills"). */
  team: string;
  /** Fresh-jump magnitude in points versus the previous synced row. */
  points: number;
};

/**
 * Title + body for the single consolidated pregame push (#731): any combination
 * of unpicked-game reminder and qualifying line-shifts due for one user in one
 * run collapses into one notification. Pure so the copy matrix (reminder-only /
 * shift-only / both / multiple shifts) can be unit-tested without a database.
 * Returns null when there is nothing to say.
 */
export function pregamePushBody(args: {
  unpickedCount: number;
  lineShifts: PregameLineShift[];
}): { title: string; body: string } | null {
  const pts = (n: number) => `${n} pt${n === 1 ? '' : 's'}`;
  const { unpickedCount, lineShifts } = args;
  if (unpickedCount === 0 && lineShifts.length === 0) return null;

  const reminderClause =
    unpickedCount === 1
      ? 'you have 1 unpicked game kicking off soon'
      : `you have ${unpickedCount} unpicked games kicking off soon`;

  if (lineShifts.length === 0) {
    return {
      title: 'Picks lock soon',
      body: `You have ${unpickedCount} unpicked game${unpickedCount === 1 ? '' : 's'} kicking off soon.`
    };
  }

  const shiftClause =
    lineShifts.length === 1
      ? `The line on your ${lineShifts[0].team} pick moved ${pts(lineShifts[0].points)}`
      : `Lines moved on ${lineShifts.length} of your picks (${lineShifts
          .map((s) => `${s.team} ${pts(s.points)}`)
          .join(', ')})`;

  if (unpickedCount === 0) {
    return {
      title: lineShifts.length === 1 ? 'Line moved on your pick' : 'Lines moved on your picks',
      body: `${shiftClause} — here's your shot to react before kickoff.`
    };
  }

  return {
    title: 'Heads up before kickoff',
    body: `${shiftClause}, and ${reminderClause}. Your shot to react before kickoff.`
  };
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

/**
 * Push body for the "recap ready" alert: the AI recap's opening sentence, so the
 * lock screen shows a real, quotable beat instead of a generic "it dropped". Pure
 * so it can be unit-tested without a database (mirrors formatRecapBody). The weekly
 * voice is prompted to open with a self-contained hook, so sentence one is the
 * teaser; this isolates and length-caps it.
 */
export function recapPushBody(prose: string): string {
  const text = (prose ?? '').trim();
  // Defensive: prose is NOT NULL and always generated, but never ship an empty push.
  if (!text) return 'Your league’s AI recap just dropped.';

  // First sentence: up to the first . ! or ? that is followed by whitespace or the
  // end of the text. Requiring the trailing space keeps decimals ("-3.5") and
  // percentages intact instead of splitting mid-number.
  const match = text.match(/[.!?](?=\s|$)/);
  let sentence = (match?.index != null ? text.slice(0, match.index + 1) : text).trim();

  // Backstop so an unusually long opener stays lock-screen-friendly.
  const MAX = 150;
  if (sentence.length > MAX) {
    sentence =
      sentence
        .slice(0, MAX)
        .replace(/\s+\S*$/, '')
        .trimEnd() + '…';
  }
  return sentence;
}

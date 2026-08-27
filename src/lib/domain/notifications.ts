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
 * What one push attempt actually achieved (#815). Returned by `sendToUser` and
 * recorded on every `notification_log` row, so "we sent a notification" is never
 * again reported without evidence that a device took it.
 */
export type DeliveryOutcome = {
  /** Subscriptions the push service accepted. */
  sent: number;
  /**
   * Subscriptions the user had when the send started — the denominator `sent` is
   * measured against. Without it `sent: 0` is ambiguous: no devices to push to, or
   * devices that all rejected the push. Those need different answers everywhere.
   */
  total: number;
  /** Subscriptions deleted because the push service reported them gone (404/410). */
  pruned: number;
};

/**
 * Does this `notification_log` row hold its dedup slot — i.e. does its existence
 * still suppress a re-send? Rows carry their delivery result under
 * `detail.delivery` (#815); a push that reached **zero devices while devices
 * existed** is a delivery failure, not a notification, so it releases the slot and
 * the next cron run retries it.
 *
 * The deliberate exception is `total === 0`: a user with no push subscriptions has
 * nothing to retry, and releasing the slot there would re-attempt — and re-log —
 * on every run for as long as they stay unsubscribed. Those rows hold.
 *
 * Rows written before #815 carry no `delivery` key and hold unconditionally: absent
 * evidence, treat history as delivered rather than re-notifying a league about games
 * that are long over.
 */
export function holdsDedupSlot(detail: unknown): boolean {
  if (!detail || typeof detail !== 'object') return true;
  const delivery = (detail as { delivery?: unknown }).delivery;
  if (!delivery || typeof delivery !== 'object') return true;
  const { sent, total } = delivery as { sent?: unknown; total?: unknown };
  if (typeof sent !== 'number' || typeof total !== 'number') return true;
  return sent > 0 || total === 0;
}

/** How the admin test-notification result should be surfaced. */
export type PushNoteKind = 'success' | 'warn' | 'error';

/**
 * Operator-facing verdict on an admin test push (#815). The old card mapped every
 * `sent === 0` to "No active subscriptions", which sent the operator off to
 * re-subscribe whenever subscriptions existed but all failed — minting another dead
 * row and hiding the real failure. The two zero-delivery cases are distinct
 * diagnoses and get distinct messages.
 */
export function testPushMessage(result: DeliveryOutcome): { kind: PushNoteKind; text: string } {
  const { sent, total, pruned } = result;
  const subs = (n: number) => `${n} subscription${n === 1 ? '' : 's'}`;
  // Pruned rows are already deleted by the time this renders — say so, because dead
  // rows silently accumulating is exactly what made this surface untrustworthy.
  const prunedNote = pruned > 0 ? ` ${subs(pruned)} were stale and have been removed.` : '';

  if (total === 0) {
    return {
      kind: 'warn',
      text: 'No active subscriptions — enable notifications on this device first.'
    };
  }
  if (sent === 0) {
    return {
      kind: 'error',
      text: `0 of ${subs(total)} accepted the push — they exist, but every one failed. Check Sentry for the push-service error.${prunedNote}`
    };
  }
  if (sent < total) {
    return {
      kind: 'warn',
      text: `Sent test to ${sent} of ${subs(total)} — ${total - sent} failed.${prunedNote}`
    };
  }
  return { kind: 'success', text: `Sent test to ${subs(sent)}.` };
}

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
 * The prefs to store when a device successfully subscribes to push (#858).
 *
 * Subscribing is an explicit opt-in, so it turns the account-level master switch on;
 * every sub-toggle keeps its stored value. The raw jsonb is coerced through
 * `parseNotificationPrefs` first, so a legacy or partial row is repaired rather than
 * clobbered. Returns null when the switch is already on — there is nothing to write.
 */
export function prefsAfterSubscribe(raw: unknown): NotificationPrefs | null {
  const prefs = parseNotificationPrefs(raw);
  if (prefs.enabled) return null;
  return { ...prefs, enabled: true };
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
  /**
   * Does this round count (ADR-0016 `weeks.is_scoring`)? Defaults to true. On a
   * non-scoring round the reminder says so out loud (#793), matching the "This round
   * doesn't count" caption already on /picks — a lock-soon nudge with no caveat would
   * imply stakes the round doesn't carry. Only the reminder-only branch varies:
   * line-shift detection is skipped entirely for a non-scoring round upstream, so no
   * shift copy can reach here on one.
   */
  scoring?: boolean;
}): { title: string; body: string } | null {
  const pts = (n: number) => `${n} pt${n === 1 ? '' : 's'}`;
  const { unpickedCount, lineShifts, scoring = true } = args;
  if (unpickedCount === 0 && lineShifts.length === 0) return null;

  const reminderClause =
    unpickedCount === 1
      ? 'you have 1 unpicked game kicking off soon'
      : `you have ${unpickedCount} unpicked games kicking off soon`;

  if (lineShifts.length === 0) {
    const games = `${unpickedCount} unpicked game${unpickedCount === 1 ? '' : 's'} kicking off soon`;
    return {
      title: 'Picks lock soon',
      body: scoring
        ? `You have ${games}.`
        : `You have ${games}. This round doesn't count — just for fun.`
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
 * The record-and-net half of a recap push, with no trailing punctuation:
 *   "3-1 with 1 push · +7 points this week" / "3-1 with 1 push · +7 points"
 *
 * Push/missed clauses are omitted when zero. `thisWeek` is dropped in the merged
 * weekly-recap body (#813) — that push's title already names the week, and the room
 * for the AI beat has to come from somewhere. It survives on the results-only form,
 * whose copy stays byte-identical to what shipped.
 */
export function recapStatLine(
  t: RecapTally,
  { thisWeek = false }: { thisWeek?: boolean } = {}
): string {
  let record = `${t.wins}-${t.losses}`;
  const extras: string[] = [];
  if (t.pushes > 0) extras.push(`${t.pushes} push${t.pushes === 1 ? '' : 'es'}`);
  if (t.missed > 0) extras.push(`${t.missed} missed`);
  if (extras.length > 0) record += ` with ${extras.join(' and ')}`;

  const sign = t.net > 0 ? '+' : '';
  const suffix = thisWeek ? ' this week' : '';
  const points = `${sign}${t.net} point${Math.abs(t.net) === 1 ? '' : 's'}${suffix}`;

  return `${record} · ${points}`;
}

/**
 * One-line push body summarizing a user's week. Pure so it can be unit-tested
 * without a database. Push/missed clauses are omitted when zero.
 *   e.g. "3-1 with 1 push · +7 points this week. Tap for the breakdown."
 */
export function formatRecapBody(t: RecapTally): string {
  // The push lands on /week (#776 — the week's own destination), so the tail names the
  // pick breakdown it opens rather than the standings it used to.
  return `${recapStatLine(t, { thisWeek: true })}. Tap for the breakdown.`;
}

/** Cap for the AI beat when it is the whole push body. */
const RECAP_BEAT_MAX = 150;

/**
 * Tighter cap for the beat when it rides behind the user's record in the merged
 * weekly-recap push (#813), so the two halves together still land near 150.
 */
const MERGED_RECAP_BEAT_MAX = 120;

/**
 * Push body for the "recap ready" alert: the AI recap's opening sentence, so the
 * lock screen shows a real, quotable beat instead of a generic "it dropped". Pure
 * so it can be unit-tested without a database (mirrors formatRecapBody). The weekly
 * voice is prompted to open with a self-contained hook, so sentence one is the
 * teaser; this isolates and length-caps it.
 */
export function recapPushBody(prose: string, maxLength = RECAP_BEAT_MAX): string {
  const text = (prose ?? '').trim();
  // Defensive: prose is NOT NULL and always generated, but never ship an empty push.
  if (!text) return 'Your league’s AI recap just dropped.';

  // First sentence: up to the first . ! or ? that is followed by whitespace or the
  // end of the text. Requiring the trailing space keeps decimals ("-3.5") and
  // percentages intact instead of splitting mid-number.
  const match = text.match(/[.!?](?=\s|$)/);
  let sentence = (match?.index != null ? text.slice(0, match.index + 1) : text).trim();

  // Backstop so an unusually long opener stays lock-screen-friendly.
  if (sentence.length > maxLength) {
    sentence =
      sentence
        .slice(0, maxLength)
        .replace(/\s+\S*$/, '')
        .trimEnd() + '…';
  }
  return sentence;
}

/**
 * Title + body for the single Tuesday-morning weekly-recap push (#813). The two
 * post-grading pushes — the personal `results_recap` and the group `ai_recap` —
 * used to fire seconds apart out of the same cron run; this composes whichever of
 * them is due for one (user, group) into one notification. Pure, so the copy matrix
 * is unit-testable without a database (mirrors `pregamePushBody`, including its
 * null-when-nothing-to-say contract).
 *
 * The personal line leads and the beat follows: the record/net is short and
 * deterministic (~29 chars) while the beat is variable, so an OS truncation eats
 * flavour rather than substance. In the merged form the `Tap for the breakdown.`
 * tail is dropped — it reads as a mid-thought beside a quote, and the beat is the
 * better invitation anyway. Both single-concern forms stay byte-identical to what
 * shipped, which is what their existing tests still prove.
 *
 * `prose: null` means "no `ai_recaps` row for this group/week". That is distinct
 * from an empty string — a row whose prose came back blank still earns
 * `recapPushBody`'s fallback copy rather than silence, exactly as before.
 */
export function weeklyRecapPushBody(args: {
  weekNumber: number;
  tally: RecapTally | null;
  prose: string | null;
}): { title: string; body: string } | null {
  const { weekNumber, tally, prose } = args;
  const resultsTitle = `Your Week ${weekNumber} results`;

  if (prose === null) {
    return tally ? { title: resultsTitle, body: formatRecapBody(tally) } : null;
  }
  if (!tally) {
    return { title: `Week ${weekNumber} recap is ready`, body: recapPushBody(prose) };
  }
  return {
    title: resultsTitle,
    body: `${recapStatLine(tally)}. “${recapPushBody(prose, MERGED_RECAP_BEAT_MAX)}”`
  };
}

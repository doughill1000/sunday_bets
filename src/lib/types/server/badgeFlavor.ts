// AI badge-flavor facts (#416, epic #283 Wave 3): the crowned-badge edition of the Season
// Wrapped packet. One deterministic packet per AWARDED badge for a completed season, voiced
// into a single personalized tagline that overrides the static FLAVORS slot in
// src/lib/domain/badges.ts. The award stays deterministic (computeBadges); only the voice is
// stored (ADR-0008, boundary 5). See badgeFlavorFacts.ts.
import type { SpiceLevel } from '$lib/types/server/recap';
import type { BadgeId, BadgeKind } from '$lib/types/honors';

/**
 * The specific earning numbers for one badge holder — numeric primitives only, never a
 * user_id/email or any PII. Keys are badge-specific (e.g. { allin_wins, allin_losses } for
 * The Choker). The voice packet carries these alongside a display name and nothing else.
 */
export type BadgeEarningStat = Record<string, number>;

/** One holder of an awarded badge: display-name-only, opt-out neutralized, with its stat. */
export type BadgeFlavorHolder = {
  /** The holder's display name, or 'a player' when they opted out of AI roasting. */
  display_name: string;
  /** True when this holder opted out — the voice narrates them neutrally, never roasted. */
  opted_out: boolean;
  /** Badge-specific earning numbers that justify the crown. */
  stat: BadgeEarningStat;
};

/**
 * One awarded badge to voice + persist — the crowned-badge analog of SeasonWrappedSubject.
 * Discriminated only by badge_id; a title has one holder, a milestone has one or more.
 */
export type BadgeFlavorSubject = {
  badge_id: BadgeId;
  label: string;
  emoji: string;
  kind: BadgeKind;
  /** Plain-English earning criteria (from FLAVORS[id].description) — orients the model. */
  description: string;
  /** The exact current static tagline — the deterministic fallback if the AI call fails. */
  static_flavor: string;
  holders: BadgeFlavorHolder[];
  /** True when any holder opted out; the packet then instructs neutral narration. */
  any_opted_out: boolean;
  group_name: string;
  season_year: number;
  spice: SpiceLevel;
};

/** The deterministic facts packet persisted alongside a generated flavor (ai_badge_flavors.facts). */
export type BadgeFlavorFacts = {
  label: string;
  kind: BadgeKind;
  description: string;
  holders: BadgeFlavorHolder[];
};

/** A persisted row from public.ai_badge_flavors. `facts` is the per-badge packet above. */
export type BadgeFlavorRow = {
  id: string;
  group_id: string;
  season_year: number;
  badge_id: string;
  flavor: string;
  facts: BadgeFlavorFacts;
  is_fallback: boolean;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  created_at: string;
};

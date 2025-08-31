import { pgTable, foreignKey, pgPolicy, uuid, text, timestamp, unique, integer, boolean, jsonb, uniqueIndex, numeric, date, primaryKey, pgView, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const weightEnum = pgEnum("weight_enum", ['L', 'M', 'H', 'A'])


export const users = pgTable("users", {
	id: uuid().primaryKey().notNull(),
	displayName: text("display_name").notNull(),
	role: text().default('player').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.id],
			foreignColumns: [table.id],
			name: "users_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("sel_users", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("upd_users_self", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const seasons = pgTable("seasons", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "seasons_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	league: text().default('NFL').notNull(),
	year: integer().notNull(),
}, (table) => [
	unique("ux_seasons_league_year").on(table.league, table.year),
]);

export const weeks = pgTable("weeks", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "weeks_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	seasonId: integer("season_id").notNull(),
	weekNumber: integer("week_number").notNull(),
	startTs: timestamp("start_ts", { withTimezone: true, mode: 'string' }).notNull(),
	endTs: timestamp("end_ts", { withTimezone: true, mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.seasonId],
			foreignColumns: [seasons.id],
			name: "weeks_season_id_fkey"
		}).onDelete("cascade"),
	unique("ux_weeks_season_week").on(table.seasonId, table.weekNumber),
]);

export const teams = pgTable("teams", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "teams_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	league: text().default('NFL').notNull(),
	externalKey: text("external_key"),
	name: text().notNull(),
	shortName: text("short_name").notNull(),
}, (table) => [
	unique("teams_external_key_key").on(table.externalKey),
]);

export const games = pgTable("games", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	weekId: integer("week_id").notNull(),
	externalGameId: text("external_game_id"),
	espnEventId: text("espn_event_id"),
	commenceTime: timestamp("commence_time", { withTimezone: true, mode: 'string' }).notNull(),
	homeTeamId: integer("home_team_id").notNull(),
	awayTeamId: integer("away_team_id").notNull(),
	status: text().default('scheduled').notNull(),
	finalScores: jsonb("final_scores"),
}, (table) => [
	foreignKey({
			columns: [table.awayTeamId],
			foreignColumns: [teams.id],
			name: "games_away_team_id_fkey"
		}),
	foreignKey({
			columns: [table.homeTeamId],
			foreignColumns: [teams.id],
			name: "games_home_team_id_fkey"
		}),
	foreignKey({
			columns: [table.weekId],
			foreignColumns: [weeks.id],
			name: "games_week_id_fkey"
		}).onDelete("cascade"),
	unique("games_external_game_id_key").on(table.externalGameId),
	unique("games_espn_event_id_key").on(table.espnEventId),
	pgPolicy("sel_games", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const gameLines = pgTable("game_lines", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "game_lines_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	gameId: uuid("game_id").notNull(),
	source: text().default('fanduel').notNull(),
	spreadTeamId: integer("spread_team_id").notNull(),
	spreadValue: numeric("spread_value").notNull(),
	fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isActiveLine: boolean("is_active_line").default(false).notNull(),
}, (table) => [
	uniqueIndex("ux_game_lines_active").using("btree", table.gameId.asc().nullsLast().op("uuid_ops")).where(sql`(is_active_line = true)`),
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "game_lines_game_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.spreadTeamId],
			foreignColumns: [teams.id],
			name: "game_lines_spread_team_id_fkey"
		}),
	pgPolicy("sel_game_lines", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const results = pgTable("results", {
	gameId: uuid("game_id").primaryKey().notNull(),
	winningTeamId: integer("winning_team_id"),
	coverResult: text("cover_result"),
	gradedAt: timestamp("graded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "results_game_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("sel_results", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const settings = pgTable("settings", {
	id: boolean().default(true).primaryKey().notNull(),
	oddsApiMonthlyCap: integer("odds_api_monthly_cap").default(500).notNull(),
	oddsApiCallsUsedCurrentMonth: integer("odds_api_calls_used_current_month").default(0).notNull(),
	resetOn: date("reset_on"),
}, (table) => [
	pgPolicy("admin_sel_settings", { as: "permissive", for: "select", to: ["authenticated"], using: sql`is_admin()` }),
	pgPolicy("admin_all_settings", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const auditLog = pgTable("audit_log", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "audit_log_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	actor: uuid(),
	action: text().notNull(),
	details: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.actor],
			foreignColumns: [users.id],
			name: "audit_log_actor_fkey"
		}),
	pgPolicy("admin_sel_audit", { as: "permissive", for: "select", to: ["authenticated"], using: sql`is_admin()` }),
	pgPolicy("admin_ins_audit", { as: "permissive", for: "insert", to: ["authenticated"] }),
]);

export const totals = pgTable("totals", {
	userId: uuid("user_id").notNull(),
	weekId: integer("week_id").notNull(),
	pointsDelta: integer("points_delta").default(0).notNull(),
	seasonTotalCached: integer("season_total_cached").default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "totals_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.weekId],
			foreignColumns: [weeks.id],
			name: "totals_week_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.weekId], name: "totals_pkey"}),
	pgPolicy("sel_totals", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
]);

export const picks = pgTable("picks", {
	userId: uuid("user_id").notNull(),
	gameId: uuid("game_id").notNull(),
	pickedTeamId: integer("picked_team_id").notNull(),
	weight: weightEnum().notNull(),
	initialLockedAt: timestamp("initial_locked_at", { withTimezone: true, mode: 'string' }),
	finalLockedAt: timestamp("final_locked_at", { withTimezone: true, mode: 'string' }),
	relockUsed: boolean("relock_used").default(false).notNull(),
	initialLockedLineId: integer("initial_locked_line_id"),
	initialLockedSpreadTeamId: integer("initial_locked_spread_team_id"),
	initialLockedSpreadValue: numeric("initial_locked_spread_value"),
	finalLockedLineId: integer("final_locked_line_id"),
	finalLockedSpreadTeamId: integer("final_locked_spread_team_id"),
	finalLockedSpreadValue: numeric("final_locked_spread_value"),
	lockedBy: uuid("locked_by").default(sql`auth.uid()`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "picks_game_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.pickedTeamId],
			foreignColumns: [teams.id],
			name: "picks_picked_team_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "picks_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.gameId], name: "picks_pkey"}),
	pgPolicy("sel_picks_owner_or_started", { as: "permissive", for: "select", to: ["authenticated"], using: sql`((user_id = auth.uid()) OR game_has_started(game_id))` }),
	pgPolicy("ins_picks_own_pre", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("upd_picks_once_pre", { as: "permissive", for: "update", to: ["authenticated"] }),
]);
export const picksView = pgView("picks_view", {	gameId: uuid("game_id"),
	userId: uuid("user_id"),
	displayName: text("display_name"),
	weight: weightEnum(),
	pickedSide: text("picked_side"),
	pickedTeam: text("picked_team"),
	finalLockedAt: timestamp("final_locked_at", { withTimezone: true, mode: 'string' }),
}).as(sql`SELECT p.game_id, p.user_id, u.display_name, p.weight, CASE WHEN p.picked_team_id = g.home_team_id THEN 'home'::text WHEN p.picked_team_id = g.away_team_id THEN 'away'::text ELSE NULL::text END AS picked_side, t.short_name AS picked_team, p.final_locked_at FROM picks p JOIN users u ON u.id = p.user_id JOIN games g ON g.id = p.game_id JOIN teams t ON t.id = p.picked_team_id`);
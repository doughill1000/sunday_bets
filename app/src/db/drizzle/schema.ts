import { pgTable, foreignKey, pgPolicy, uuid, text, timestamp, unique, bigserial, integer, bigint, boolean, uniqueIndex, numeric, jsonb, date, primaryKey, pgEnum } from "drizzle-orm/pg-core"
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
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	league: text().default('NFL').notNull(),
	year: integer().notNull(),
}, (table) => [
	unique("ux_seasons_league_year").on(table.league, table.year),
]);

export const weeks = pgTable("weeks", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	seasonId: bigint("season_id", { mode: "number" }).notNull(),
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
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	league: text().default('NFL').notNull(),
	externalKey: text("external_key"),
	name: text().notNull(),
	shortName: text("short_name").notNull(),
}, (table) => [
	unique("teams_external_key_key").on(table.externalKey),
]);

export const gameLines = pgTable("game_lines", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	gameId: uuid("game_id").notNull(),
	source: text().default('barstool').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	spreadTeamId: bigint("spread_team_id", { mode: "number" }).notNull(),
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
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	winningTeamId: bigint("winning_team_id", { mode: "number" }),
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

export const games = pgTable("games", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	weekId: bigint("week_id", { mode: "number" }).notNull(),
	externalGameId: text("external_game_id"),
	espnEventId: text("espn_event_id"),
	commenceTime: timestamp("commence_time", { withTimezone: true, mode: 'string' }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	homeTeamId: bigint("home_team_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	awayTeamId: bigint("away_team_id", { mode: "number" }).notNull(),
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
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
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
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	weekId: bigint("week_id", { mode: "number" }).notNull(),
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
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pickedTeamId: bigint("picked_team_id", { mode: "number" }).notNull(),
	weight: weightEnum().notNull(),
	initialLockedAt: timestamp("initial_locked_at", { withTimezone: true, mode: 'string' }),
	finalLockedAt: timestamp("final_locked_at", { withTimezone: true, mode: 'string' }),
	relockUsed: boolean("relock_used").default(false).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	initialLockedLineId: bigint("initial_locked_line_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	initialLockedSpreadTeamId: bigint("initial_locked_spread_team_id", { mode: "number" }),
	initialLockedSpreadValue: numeric("initial_locked_spread_value"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	finalLockedLineId: bigint("final_locked_line_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	finalLockedSpreadTeamId: bigint("final_locked_spread_team_id", { mode: "number" }),
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

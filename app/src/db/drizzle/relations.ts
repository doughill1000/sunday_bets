import { relations } from "drizzle-orm/relations";
import { usersInAuth, users, seasons, weeks, games, gameLines, teams, results, auditLog, totals, picks } from "./schema";

export const usersRelations = relations(users, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [users.id],
		references: [usersInAuth.id]
	}),
	auditLogs: many(auditLog),
	totals: many(totals),
	picks: many(picks),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	users: many(users),
}));

export const weeksRelations = relations(weeks, ({one, many}) => ({
	season: one(seasons, {
		fields: [weeks.seasonId],
		references: [seasons.id]
	}),
	games: many(games),
	totals: many(totals),
}));

export const seasonsRelations = relations(seasons, ({many}) => ({
	weeks: many(weeks),
}));

export const gameLinesRelations = relations(gameLines, ({one}) => ({
	game: one(games, {
		fields: [gameLines.gameId],
		references: [games.id]
	}),
	team: one(teams, {
		fields: [gameLines.spreadTeamId],
		references: [teams.id]
	}),
}));

export const gamesRelations = relations(games, ({one, many}) => ({
	gameLines: many(gameLines),
	results: many(results),
	team_awayTeamId: one(teams, {
		fields: [games.awayTeamId],
		references: [teams.id],
		relationName: "games_awayTeamId_teams_id"
	}),
	team_homeTeamId: one(teams, {
		fields: [games.homeTeamId],
		references: [teams.id],
		relationName: "games_homeTeamId_teams_id"
	}),
	week: one(weeks, {
		fields: [games.weekId],
		references: [weeks.id]
	}),
	picks: many(picks),
}));

export const teamsRelations = relations(teams, ({many}) => ({
	gameLines: many(gameLines),
	games_awayTeamId: many(games, {
		relationName: "games_awayTeamId_teams_id"
	}),
	games_homeTeamId: many(games, {
		relationName: "games_homeTeamId_teams_id"
	}),
	picks: many(picks),
}));

export const resultsRelations = relations(results, ({one}) => ({
	game: one(games, {
		fields: [results.gameId],
		references: [games.id]
	}),
}));

export const auditLogRelations = relations(auditLog, ({one}) => ({
	user: one(users, {
		fields: [auditLog.actor],
		references: [users.id]
	}),
}));

export const totalsRelations = relations(totals, ({one}) => ({
	user: one(users, {
		fields: [totals.userId],
		references: [users.id]
	}),
	week: one(weeks, {
		fields: [totals.weekId],
		references: [weeks.id]
	}),
}));

export const picksRelations = relations(picks, ({one}) => ({
	game: one(games, {
		fields: [picks.gameId],
		references: [games.id]
	}),
	team: one(teams, {
		fields: [picks.pickedTeamId],
		references: [teams.id]
	}),
	user: one(users, {
		fields: [picks.userId],
		references: [users.id]
	}),
}));
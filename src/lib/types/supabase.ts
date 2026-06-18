export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          details: Json | null
          id: number
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          details?: Json | null
          id?: number
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          details?: Json | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_run_log: {
        Row: {
          error: string | null
          finished_at: string | null
          id: number
          job: string
          ok: boolean | null
          started_at: string
          summary: Json | null
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: never
          job: string
          ok?: boolean | null
          started_at?: string
          summary?: Json | null
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: never
          job?: string
          ok?: boolean | null
          started_at?: string
          summary?: Json | null
        }
        Relationships: []
      }
      game_lines: {
        Row: {
          fetched_at: string
          game_id: string
          id: number
          is_active_line: boolean
          source: string
          spread_team_id: number
          spread_value: number
        }
        Insert: {
          fetched_at?: string
          game_id: string
          id?: number
          is_active_line?: boolean
          source?: string
          spread_team_id: number
          spread_value: number
        }
        Update: {
          fetched_at?: string
          game_id?: string
          id?: number
          is_active_line?: boolean
          source?: string
          spread_team_id?: number
          spread_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_lines_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_lines_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "ui_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_lines_spread_team_id_fkey"
            columns: ["spread_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          away_team_id: number
          commence_time: string
          external_game_id: string | null
          final_scores: Json | null
          home_team_id: number
          id: string
          status: string
          week_id: number
        }
        Insert: {
          away_team_id: number
          commence_time: string
          external_game_id?: string | null
          final_scores?: Json | null
          home_team_id: number
          id?: string
          status?: string
          week_id: number
        }
        Update: {
          away_team_id?: number
          commence_time?: string
          external_game_id?: string | null
          final_scores?: Json | null
          home_team_id?: number
          id?: string
          status?: string
          week_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      pick_settlement: {
        Row: {
          game_id: string
          graded_at: string
          outcome: Database["public"]["Enums"]["pick_outcome"] | null
          pick_id: string | null
          points_delta: number | null
          user_id: string
        }
        Insert: {
          game_id: string
          graded_at?: string
          outcome?: Database["public"]["Enums"]["pick_outcome"] | null
          pick_id?: string | null
          points_delta?: number | null
          user_id: string
        }
        Update: {
          game_id?: string
          graded_at?: string
          outcome?: Database["public"]["Enums"]["pick_outcome"] | null
          pick_id?: string | null
          points_delta?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pick_settlement_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_settlement_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "ui_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_settlement_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: false
            referencedRelation: "picks"
            referencedColumns: ["id"]
          },
        ]
      }
      picks: {
        Row: {
          game_id: string
          id: string
          locked_at: string
          locked_by: string
          locked_line_id: number | null
          locked_spread_team_id: number
          locked_spread_value: number
          picked_team_id: number
          user_id: string
          weight: Database["public"]["Enums"]["weight_enum"]
        }
        Insert: {
          game_id: string
          id?: string
          locked_at: string
          locked_by?: string
          locked_line_id?: number | null
          locked_spread_team_id: number
          locked_spread_value: number
          picked_team_id: number
          user_id: string
          weight: Database["public"]["Enums"]["weight_enum"]
        }
        Update: {
          game_id?: string
          id?: string
          locked_at?: string
          locked_by?: string
          locked_line_id?: number | null
          locked_spread_team_id?: number
          locked_spread_value?: number
          picked_team_id?: number
          user_id?: string
          weight?: Database["public"]["Enums"]["weight_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "ui_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_picked_team_id_fkey"
            columns: ["picked_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          cover_result: string | null
          game_id: string
          graded_at: string
          winning_team_id: number | null
        }
        Insert: {
          cover_result?: string | null
          game_id: string
          graded_at?: string
          winning_team_id?: number | null
        }
        Update: {
          cover_result?: string | null
          game_id?: string
          graded_at?: string
          winning_team_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "results_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "ui_games"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          id: number
          league: string
          year: number
        }
        Insert: {
          id?: number
          league?: string
          year: number
        }
        Update: {
          id?: number
          league?: string
          year?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: boolean
          missed_pick_penalty: number | null
          odds_api_calls_used_current_month: number
          odds_api_monthly_cap: number
          reset_on: string | null
        }
        Insert: {
          id?: boolean
          missed_pick_penalty?: number | null
          odds_api_calls_used_current_month?: number
          odds_api_monthly_cap?: number
          reset_on?: string | null
        }
        Update: {
          id?: boolean
          missed_pick_penalty?: number | null
          odds_api_calls_used_current_month?: number
          odds_api_monthly_cap?: number
          reset_on?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          external_key: string | null
          id: number
          league: string
          name: string
          short_name: string
        }
        Insert: {
          external_key?: string | null
          id?: number
          league?: string
          name: string
          short_name: string
        }
        Update: {
          external_key?: string | null
          id?: number
          league?: string
          name?: string
          short_name?: string
        }
        Relationships: []
      }
      totals: {
        Row: {
          points_delta: number
          season_total_cached: number
          user_id: string
          week_id: number
        }
        Insert: {
          points_delta?: number
          season_total_cached?: number
          user_id: string
          week_id: number
        }
        Update: {
          points_delta?: number
          season_total_cached?: number
          user_id?: string
          week_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "totals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "totals_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      weeks: {
        Row: {
          end_ts: string
          id: number
          season_id: number
          start_ts: string
          week_number: number
        }
        Insert: {
          end_ts: string
          id?: number
          season_id: number
          start_ts: string
          week_number: number
        }
        Update: {
          end_ts?: string
          id?: number
          season_id?: number
          start_ts?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "weeks_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      current_season_year: {
        Row: {
          season_year: number | null
        }
        Relationships: []
      }
      leaderboard_season_totals: {
        Row: {
          decisions: number | null
          display_name: string | null
          losses: number | null
          missed: number | null
          pushes: number | null
          rank: number | null
          season_year: number | null
          total_points: number | null
          user_id: string | null
          wins: number | null
        }
        Relationships: []
      }
      leaderboard_weekly_cumulative: {
        Row: {
          cumulative_points: number | null
          cumulative_rank_this_week: number | null
          display_name: string | null
          season_total: number | null
          season_year: number | null
          user_id: string | null
          week_losses: number | null
          week_missed: number | null
          week_number: number | null
          week_points: number | null
          week_pushes: number | null
          week_wins: number | null
        }
        Relationships: []
      }
      picks_status_view_admin: {
        Row: {
          commence_time: string | null
          game_id: string | null
          game_started: boolean | null
          locked_at: string | null
          locked_spread_team_id: number | null
          locked_spread_value: number | null
          picked_side: Database["public"]["Enums"]["side_enum"] | null
          picked_team_id: number | null
          picked_team_short: string | null
          user_display_name: string | null
          user_id: string | null
          week_id: number | null
          weight: Database["public"]["Enums"]["weight_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "games_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "ui_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_picked_team_id_fkey"
            columns: ["picked_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      picks_status_view_user: {
        Row: {
          commence_time: string | null
          game_id: string | null
          game_started: boolean | null
          locked_at: string | null
          locked_spread_team_id: number | null
          locked_spread_value: number | null
          picked_side: Database["public"]["Enums"]["side_enum"] | null
          picked_team_id: number | null
          picked_team_short: string | null
          user_id: string | null
          week_id: number | null
          weight: Database["public"]["Enums"]["weight_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "games_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "ui_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_picked_team_id_fkey"
            columns: ["picked_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ui_games: {
        Row: {
          away: string | null
          away_team_id: number | null
          favorite_team_id: number | null
          home: string | null
          home_team_id: number | null
          id: string | null
          kickoff: string | null
          spread_value: number | null
          week_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_lines_spread_team_id_fkey"
            columns: ["favorite_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _grade_games_by_ids: {
        Args: { p_game_ids: string[] }
        Returns: undefined
      }
      advance_week_if_complete: { Args: never; Returns: Json }
      ats_margin_at_lock: {
        Args: {
          away_id: number
          away_pts: number
          home_id: number
          home_pts: number
          spread_team_id: number
          spread_value: number
        }
        Returns: number
      }
      audit_log_action: {
        Args: { p_action: string; p_actor: string; p_details: Json }
        Returns: undefined
      }
      game_has_started: { Args: { p_game_id: string }; Returns: boolean }
      grade_game: { Args: { p_game_id: string }; Returns: undefined }
      grade_pick: {
        Args: {
          away_id: number
          away_pts: number
          home_id: number
          home_pts: number
          picked_team_id: number
          spread_team_id: number
          spread_value: number
          weight: string
        }
        Returns: {
          outcome: Database["public"]["Enums"]["pick_outcome"]
          points_delta: number
        }[]
      }
      grade_season: { Args: { p_season_id: number }; Returns: undefined }
      grade_week: { Args: { p_week_id: number }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      lock_pick: {
        Args: {
          p_game_id: string
          p_side: Database["public"]["Enums"]["side_enum"]
          p_source?: string
          p_weight: Database["public"]["Enums"]["weight_enum"]
        }
        Returns: {
          game_id: string
          locked_at: string
          ok: boolean
          picked_side: Database["public"]["Enums"]["side_enum"]
          user_id: string
          weight: Database["public"]["Enums"]["weight_enum"]
        }[]
      }
      resolve_missed_penalty_for_game: {
        Args: { p_game_id: string }
        Returns: number
      }
      set_active_line: {
        Args: {
          p_game_id: string
          p_source?: string
          p_spread_team_id: number
          p_spread_value: number
        }
        Returns: Json
      }
      unlock_pick: {
        Args: { p_game_id: string }
        Returns: {
          game_id: string
          ok: boolean
          unlocked_at: string
          user_id: string
        }[]
      }
      upsert_game_by_external_id: {
        Args: {
          p_away_team_id: number
          p_commence: string
          p_external_game_id: string
          p_home_team_id: number
          p_week_id: number
        }
        Returns: string
      }
      weight_points: { Args: { p_weight: string }; Returns: number }
    }
    Enums: {
      cover_side: "home" | "away" | "push"
      pick_outcome: "win" | "loss" | "push" | "missed"
      side_enum: "home" | "away"
      weight_enum: "L" | "M" | "H" | "A"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cover_side: ["home", "away", "push"],
      pick_outcome: ["win", "loss", "push", "missed"],
      side_enum: ["home", "away"],
      weight_enum: ["L", "M", "H", "A"],
    },
  },
} as const


export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
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
      picks: {
        Row: {
          game_id: string
          locked_at: string | null
          locked_by: string
          locked_line_id: number | null
          locked_spread_team_id: number | null
          locked_spread_value: number | null
          picked_team_id: number
          user_id: string
          weight: Database["public"]["Enums"]["weight_enum"]
        }
        Insert: {
          game_id: string
          locked_at?: string | null
          locked_by?: string
          locked_line_id?: number | null
          locked_spread_team_id?: number | null
          locked_spread_value?: number | null
          picked_team_id: number
          user_id: string
          weight: Database["public"]["Enums"]["weight_enum"]
        }
        Update: {
          game_id?: string
          locked_at?: string | null
          locked_by?: string
          locked_line_id?: number | null
          locked_spread_team_id?: number | null
          locked_spread_value?: number | null
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
          odds_api_calls_used_current_month: number
          odds_api_monthly_cap: number
          reset_on: string | null
        }
        Insert: {
          id?: boolean
          odds_api_calls_used_current_month?: number
          odds_api_monthly_cap?: number
          reset_on?: string | null
        }
        Update: {
          id?: boolean
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
    }
    Functions: {
      audit_log_action: {
        Args: { p_action: string; p_actor: string; p_details: Json }
        Returns: undefined
      }
      current_active_line: {
        Args: { p_game_id: string }
        Returns: {
          fetched_at: string
          game_id: string
          id: number
          is_active_line: boolean
          source: string
          spread_team_id: number
          spread_value: number
        }
      }
      game_has_started: {
        Args: { p_game_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      lock_pick: {
        Args: {
          p_game_id: string
          p_side: string
          p_weight: Database["public"]["Enums"]["weight_enum"]
        }
        Returns: {
          game_id: string
          locked_at: string
          ok: boolean
          picked_side: string
          user_id: string
          weight: Database["public"]["Enums"]["weight_enum"]
        }[]
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
    }
    Enums: {
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
  public: {
    Enums: {
      side_enum: ["home", "away"],
      weight_enum: ["L", "M", "H", "A"],
    },
  },
} as const

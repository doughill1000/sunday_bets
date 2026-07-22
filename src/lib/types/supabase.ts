export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ai_badge_flavors: {
        Row: {
          badge_id: string;
          completion_tokens: number | null;
          created_at: string;
          facts: Json;
          flavor: string;
          group_id: string;
          id: string;
          is_fallback: boolean;
          model: string | null;
          prompt_tokens: number | null;
          season_year: number;
        };
        Insert: {
          badge_id: string;
          completion_tokens?: number | null;
          created_at?: string;
          facts: Json;
          flavor: string;
          group_id: string;
          id?: string;
          is_fallback?: boolean;
          model?: string | null;
          prompt_tokens?: number | null;
          season_year: number;
        };
        Update: {
          badge_id?: string;
          completion_tokens?: number | null;
          created_at?: string;
          facts?: Json;
          flavor?: string;
          group_id?: string;
          id?: string;
          is_fallback?: boolean;
          model?: string | null;
          prompt_tokens?: number | null;
          season_year?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_badge_flavors_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      ai_recaps: {
        Row: {
          completion_tokens: number | null;
          created_at: string;
          facts: Json;
          group_id: string;
          id: string;
          is_fallback: boolean;
          model: string | null;
          prompt_tokens: number | null;
          prose: string;
          season_year: number;
          week_number: number;
        };
        Insert: {
          completion_tokens?: number | null;
          created_at?: string;
          facts: Json;
          group_id: string;
          id?: string;
          is_fallback?: boolean;
          model?: string | null;
          prompt_tokens?: number | null;
          prose: string;
          season_year: number;
          week_number: number;
        };
        Update: {
          completion_tokens?: number | null;
          created_at?: string;
          facts?: Json;
          group_id?: string;
          id?: string;
          is_fallback?: boolean;
          model?: string | null;
          prompt_tokens?: number | null;
          prose?: string;
          season_year?: number;
          week_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_recaps_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor: string | null;
          created_at: string;
          details: Json | null;
          id: number;
        };
        Insert: {
          action: string;
          actor?: string | null;
          created_at?: string;
          details?: Json | null;
          id?: number;
        };
        Update: {
          action?: string;
          actor?: string | null;
          created_at?: string;
          details?: Json | null;
          id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_actor_fkey';
            columns: ['actor'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      comments: {
        Row: {
          body: string;
          created_at: string;
          deleted_at: string | null;
          game_id: string;
          group_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          deleted_at?: string | null;
          game_id: string;
          group_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          deleted_at?: string | null;
          game_id?: string;
          group_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'league_ats_base';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'comments_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'player_rating_inputs';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'comments_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'ui_games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      cron_run_log: {
        Row: {
          error: string | null;
          finished_at: string | null;
          id: number;
          job: string;
          ok: boolean | null;
          started_at: string;
          summary: Json | null;
        };
        Insert: {
          error?: string | null;
          finished_at?: string | null;
          id?: never;
          job: string;
          ok?: boolean | null;
          started_at?: string;
          summary?: Json | null;
        };
        Update: {
          error?: string | null;
          finished_at?: string | null;
          id?: never;
          job?: string;
          ok?: boolean | null;
          started_at?: string;
          summary?: Json | null;
        };
        Relationships: [];
      };
      espn_api_responses: {
        Row: {
          body: Json | null;
          endpoint: string;
          fetched_at: string;
          http_status: number;
          id: number;
          request_params: Json;
        };
        Insert: {
          body?: Json | null;
          endpoint: string;
          fetched_at?: string;
          http_status: number;
          id?: never;
          request_params?: Json;
        };
        Update: {
          body?: Json | null;
          endpoint?: string;
          fetched_at?: string;
          http_status?: number;
          id?: never;
          request_params?: Json;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          body: string;
          context: Json;
          created_at: string;
          github_issue_url: string | null;
          id: string;
          kind: string;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          body: string;
          context?: Json;
          created_at?: string;
          github_issue_url?: string | null;
          id?: string;
          kind?: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          body?: string;
          context?: Json;
          created_at?: string;
          github_issue_url?: string | null;
          id?: string;
          kind?: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'feedback_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      game_lines: {
        Row: {
          fetched_at: string;
          game_id: string;
          id: number;
          is_active_line: boolean;
          is_closing_line: boolean;
          source: string;
          spread_team_id: number;
          spread_value: number;
        };
        Insert: {
          fetched_at?: string;
          game_id: string;
          id?: number;
          is_active_line?: boolean;
          is_closing_line?: boolean;
          source?: string;
          spread_team_id: number;
          spread_value: number;
        };
        Update: {
          fetched_at?: string;
          game_id?: string;
          id?: number;
          is_active_line?: boolean;
          is_closing_line?: boolean;
          source?: string;
          spread_team_id?: number;
          spread_value?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'game_lines_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'game_lines_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'league_ats_base';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'game_lines_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'player_rating_inputs';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'game_lines_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'ui_games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'game_lines_spread_team_id_fkey';
            columns: ['spread_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          }
        ];
      };
      games: {
        Row: {
          away_team_id: number;
          commence_time: string;
          external_game_id: string | null;
          final_scores: Json | null;
          home_team_id: number;
          id: string;
          schedule_game_id: string | null;
          status: string;
          week_id: number;
        };
        Insert: {
          away_team_id: number;
          commence_time: string;
          external_game_id?: string | null;
          final_scores?: Json | null;
          home_team_id: number;
          id?: string;
          schedule_game_id?: string | null;
          status?: string;
          week_id: number;
        };
        Update: {
          away_team_id?: number;
          commence_time?: string;
          external_game_id?: string | null;
          final_scores?: Json | null;
          home_team_id?: number;
          id?: string;
          schedule_game_id?: string | null;
          status?: string;
          week_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'games_away_team_id_fkey';
            columns: ['away_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'games_home_team_id_fkey';
            columns: ['home_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'games_week_id_fkey';
            columns: ['week_id'];
            isOneToOne: false;
            referencedRelation: 'weeks';
            referencedColumns: ['id'];
          }
        ];
      };
      group_config: {
        Row: {
          ai_recaps_enabled: boolean;
          created_at: string;
          grading_preset: string;
          group_id: string;
          line_source: string;
          scoring_rules: Json;
          spice: string;
          updated_at: string;
        };
        Insert: {
          ai_recaps_enabled?: boolean;
          created_at?: string;
          grading_preset?: string;
          group_id: string;
          line_source?: string;
          scoring_rules?: Json;
          spice?: string;
          updated_at?: string;
        };
        Update: {
          ai_recaps_enabled?: boolean;
          created_at?: string;
          grading_preset?: string;
          group_id?: string;
          line_source?: string;
          scoring_rules?: Json;
          spice?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_config_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: true;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      group_invites: {
        Row: {
          code: string;
          created_at: string;
          created_by: string;
          expires_at: string | null;
          group_id: string;
          id: string;
          max_uses: number | null;
          revoked_at: string | null;
          used_count: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by: string;
          expires_at?: string | null;
          group_id: string;
          id?: string;
          max_uses?: number | null;
          revoked_at?: string | null;
          used_count?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string | null;
          group_id?: string;
          id?: string;
          max_uses?: number | null;
          revoked_at?: string | null;
          used_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'group_invites_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_invites_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      group_memberships: {
        Row: {
          ai_recap_opt_out: boolean;
          group_id: string;
          joined_at: string;
          role: Database['public']['Enums']['group_membership_role'];
          status: Database['public']['Enums']['group_membership_status'];
          user_id: string;
        };
        Insert: {
          ai_recap_opt_out?: boolean;
          group_id: string;
          joined_at?: string;
          role?: Database['public']['Enums']['group_membership_role'];
          status?: Database['public']['Enums']['group_membership_status'];
          user_id: string;
        };
        Update: {
          ai_recap_opt_out?: boolean;
          group_id?: string;
          joined_at?: string;
          role?: Database['public']['Enums']['group_membership_role'];
          status?: Database['public']['Enums']['group_membership_status'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_memberships_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_memberships_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      group_week_overrides: {
        Row: {
          created_at: string;
          group_id: string;
          overrides: Json;
          week_id: number;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          overrides?: Json;
          week_id: number;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          overrides?: Json;
          week_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'group_week_overrides_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_week_overrides_week_id_fkey';
            columns: ['week_id'];
            isOneToOne: false;
            referencedRelation: 'weeks';
            referencedColumns: ['id'];
          }
        ];
      };
      groups: {
        Row: {
          competition_starts_at: string;
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          competition_starts_at?: string;
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          competition_starts_at?: string;
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      notification_log: {
        Row: {
          created_at: string;
          detail: Json | null;
          game_id: string | null;
          group_id: string | null;
          id: string;
          kind: string;
          user_id: string;
          week_id: number | null;
        };
        Insert: {
          created_at?: string;
          detail?: Json | null;
          game_id?: string | null;
          group_id?: string | null;
          id?: string;
          kind: string;
          user_id: string;
          week_id?: number | null;
        };
        Update: {
          created_at?: string;
          detail?: Json | null;
          game_id?: string | null;
          group_id?: string | null;
          id?: string;
          kind?: string;
          user_id?: string;
          week_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_log_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_log_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'league_ats_base';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'notification_log_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'player_rating_inputs';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'notification_log_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'ui_games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_log_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_log_week_id_fkey';
            columns: ['week_id'];
            isOneToOne: false;
            referencedRelation: 'weeks';
            referencedColumns: ['id'];
          }
        ];
      };
      odds_api_responses: {
        Row: {
          body: Json | null;
          endpoint: string;
          fetched_at: string;
          http_status: number;
          id: number;
          request_params: Json;
        };
        Insert: {
          body?: Json | null;
          endpoint: string;
          fetched_at?: string;
          http_status: number;
          id?: never;
          request_params?: Json;
        };
        Update: {
          body?: Json | null;
          endpoint?: string;
          fetched_at?: string;
          http_status?: number;
          id?: never;
          request_params?: Json;
        };
        Relationships: [];
      };
      pick_settlement: {
        Row: {
          game_id: string;
          graded_at: string;
          graded_preset: string | null;
          group_id: string;
          outcome: Database['public']['Enums']['pick_outcome'] | null;
          pick_id: string | null;
          points_delta: number | null;
          user_id: string;
        };
        Insert: {
          game_id: string;
          graded_at?: string;
          graded_preset?: string | null;
          group_id: string;
          outcome?: Database['public']['Enums']['pick_outcome'] | null;
          pick_id?: string | null;
          points_delta?: number | null;
          user_id: string;
        };
        Update: {
          game_id?: string;
          graded_at?: string;
          graded_preset?: string | null;
          group_id?: string;
          outcome?: Database['public']['Enums']['pick_outcome'] | null;
          pick_id?: string | null;
          points_delta?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'league_ats_base';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'player_rating_inputs';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'ui_games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pick_settlement_pick_id_fkey';
            columns: ['pick_id'];
            isOneToOne: false;
            referencedRelation: 'picks';
            referencedColumns: ['id'];
          }
        ];
      };
      picks: {
        Row: {
          game_id: string;
          group_id: string;
          id: string;
          locked_at: string;
          locked_by: string;
          locked_line_id: number | null;
          locked_spread_team_id: number;
          locked_spread_value: number;
          picked_team_id: number;
          user_id: string;
          weight: Database['public']['Enums']['weight_enum'];
        };
        Insert: {
          game_id: string;
          group_id: string;
          id?: string;
          locked_at: string;
          locked_by?: string;
          locked_line_id?: number | null;
          locked_spread_team_id: number;
          locked_spread_value: number;
          picked_team_id: number;
          user_id: string;
          weight: Database['public']['Enums']['weight_enum'];
        };
        Update: {
          game_id?: string;
          group_id?: string;
          id?: string;
          locked_at?: string;
          locked_by?: string;
          locked_line_id?: number | null;
          locked_spread_team_id?: number;
          locked_spread_value?: number;
          picked_team_id?: number;
          user_id?: string;
          weight?: Database['public']['Enums']['weight_enum'];
        };
        Relationships: [
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'league_ats_base';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'player_rating_inputs';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'ui_games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_picked_team_id_fkey';
            columns: ['picked_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      player_ratings: {
        Row: {
          computed_at: string;
          decisions: number;
          decisions_to_qualify: number;
          group_id: string;
          rating: number | null;
          season_delta: number | null;
          user_id: string;
        };
        Insert: {
          computed_at?: string;
          decisions?: number;
          decisions_to_qualify?: number;
          group_id: string;
          rating?: number | null;
          season_delta?: number | null;
          user_id: string;
        };
        Update: {
          computed_at?: string;
          decisions?: number;
          decisions_to_qualify?: number;
          group_id?: string;
          rating?: number | null;
          season_delta?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth_key: string;
          created_at: string;
          endpoint: string;
          id: string;
          last_seen_at: string;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth_key: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          last_seen_at?: string;
          p256dh: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth_key?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          last_seen_at?: string;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      reactions: {
        Row: {
          comment_id: string;
          created_at: string;
          emoji: string;
          group_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          comment_id: string;
          created_at?: string;
          emoji: string;
          group_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string;
          emoji?: string;
          group_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reactions_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reactions_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      recap_seen: {
        Row: {
          group_id: string;
          season_year: number;
          seen_at: string;
          user_id: string;
          week_number: number;
        };
        Insert: {
          group_id: string;
          season_year: number;
          seen_at?: string;
          user_id: string;
          week_number: number;
        };
        Update: {
          group_id?: string;
          season_year?: number;
          seen_at?: string;
          user_id?: string;
          week_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'recap_seen_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recap_seen_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      results: {
        Row: {
          cover_result: string | null;
          game_id: string;
          graded_at: string;
          winning_team_id: number | null;
        };
        Insert: {
          cover_result?: string | null;
          game_id: string;
          graded_at?: string;
          winning_team_id?: number | null;
        };
        Update: {
          cover_result?: string | null;
          game_id?: string;
          graded_at?: string;
          winning_team_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'results_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: true;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'results_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: true;
            referencedRelation: 'league_ats_base';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'results_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: true;
            referencedRelation: 'player_rating_inputs';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'results_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: true;
            referencedRelation: 'ui_games';
            referencedColumns: ['id'];
          }
        ];
      };
      season_wrapped: {
        Row: {
          completion_tokens: number | null;
          created_at: string;
          facts: Json;
          group_id: string;
          id: string;
          is_fallback: boolean;
          model: string | null;
          prompt_tokens: number | null;
          prose: string;
          scope: string;
          season_year: number;
          subject_user_id: string | null;
        };
        Insert: {
          completion_tokens?: number | null;
          created_at?: string;
          facts: Json;
          group_id: string;
          id?: string;
          is_fallback?: boolean;
          model?: string | null;
          prompt_tokens?: number | null;
          prose: string;
          scope: string;
          season_year: number;
          subject_user_id?: string | null;
        };
        Update: {
          completion_tokens?: number | null;
          created_at?: string;
          facts?: Json;
          group_id?: string;
          id?: string;
          is_fallback?: boolean;
          model?: string | null;
          prompt_tokens?: number | null;
          prose?: string;
          scope?: string;
          season_year?: number;
          subject_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'season_wrapped_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'season_wrapped_subject_user_id_fkey';
            columns: ['subject_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      seasons: {
        Row: {
          grading_locked: boolean;
          id: number;
          league: string;
          year: number;
        };
        Insert: {
          grading_locked?: boolean;
          id?: number;
          league?: string;
          year: number;
        };
        Update: {
          grading_locked?: boolean;
          id?: number;
          league?: string;
          year?: number;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          final_week_unlimited_allin: boolean;
          group_creation_mode: string;
          id: boolean;
          missed_pick_penalty: number | null;
          odds_api_calls_used_current_month: number;
          odds_api_monthly_cap: number;
          reset_on: string | null;
        };
        Insert: {
          final_week_unlimited_allin?: boolean;
          group_creation_mode?: string;
          id?: boolean;
          missed_pick_penalty?: number | null;
          odds_api_calls_used_current_month?: number;
          odds_api_monthly_cap?: number;
          reset_on?: string | null;
        };
        Update: {
          final_week_unlimited_allin?: boolean;
          group_creation_mode?: string;
          id?: boolean;
          missed_pick_penalty?: number | null;
          odds_api_calls_used_current_month?: number;
          odds_api_monthly_cap?: number;
          reset_on?: string | null;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          conference: string | null;
          division: string | null;
          external_key: string | null;
          id: number;
          league: string;
          name: string;
          short_name: string;
        };
        Insert: {
          conference?: string | null;
          division?: string | null;
          external_key?: string | null;
          id?: number;
          league?: string;
          name: string;
          short_name: string;
        };
        Update: {
          conference?: string | null;
          division?: string | null;
          external_key?: string | null;
          id?: number;
          league?: string;
          name?: string;
          short_name?: string;
        };
        Relationships: [];
      };
      totals: {
        Row: {
          points_delta: number;
          season_total_cached: number;
          user_id: string;
          week_id: number;
        };
        Insert: {
          points_delta?: number;
          season_total_cached?: number;
          user_id: string;
          week_id: number;
        };
        Update: {
          points_delta?: number;
          season_total_cached?: number;
          user_id?: string;
          week_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'totals_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'totals_week_id_fkey';
            columns: ['week_id'];
            isOneToOne: false;
            referencedRelation: 'weeks';
            referencedColumns: ['id'];
          }
        ];
      };
      users: {
        Row: {
          avatar_key: string | null;
          can_create_group: boolean;
          created_at: string;
          display_name: string;
          guide_seen_at: string | null;
          id: string;
          notification_prefs: Json;
          role: string;
          show_team_trends: boolean;
          theme_pref: string;
        };
        Insert: {
          avatar_key?: string | null;
          can_create_group?: boolean;
          created_at?: string;
          display_name: string;
          guide_seen_at?: string | null;
          id: string;
          notification_prefs?: Json;
          role?: string;
          show_team_trends?: boolean;
          theme_pref?: string;
        };
        Update: {
          avatar_key?: string | null;
          can_create_group?: boolean;
          created_at?: string;
          display_name?: string;
          guide_seen_at?: string | null;
          id?: string;
          notification_prefs?: Json;
          role?: string;
          show_team_trends?: boolean;
          theme_pref?: string;
        };
        Relationships: [];
      };
      weeks: {
        Row: {
          end_ts: string;
          id: number;
          is_scoring: boolean;
          season_id: number;
          start_ts: string;
          week_number: number;
        };
        Insert: {
          end_ts: string;
          id?: number;
          is_scoring?: boolean;
          season_id: number;
          start_ts: string;
          week_number: number;
        };
        Update: {
          end_ts?: string;
          id?: number;
          is_scoring?: boolean;
          season_id?: number;
          start_ts?: string;
          week_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'weeks_season_id_fkey';
            columns: ['season_id'];
            isOneToOne: false;
            referencedRelation: 'seasons';
            referencedColumns: ['id'];
          }
        ];
      };
      wrapped_seen: {
        Row: {
          group_id: string;
          season_year: number;
          seen_at: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          season_year: number;
          seen_at?: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          season_year?: number;
          seen_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wrapped_seen_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wrapped_seen_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      current_season_year: {
        Row: {
          season_year: number | null;
        };
        Relationships: [];
      };
      group_pick_consensus: {
        Row: {
          consensus_pct: number | null;
          display_name: string | null;
          game_id: string | null;
          graded_outcome: Database['public']['Enums']['pick_outcome'] | null;
          group_id: string | null;
          is_minority: boolean | null;
          picked_team_id: number | null;
          season_year: number | null;
          user_id: string | null;
          week_number: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'league_ats_base';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'player_rating_inputs';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'ui_games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_picked_team_id_fkey';
            columns: ['picked_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          }
        ];
      };
      group_pick_cover: {
        Row: {
          cover_margin: number | null;
          display_name: string | null;
          game_id: string | null;
          group_id: string | null;
          outcome: Database['public']['Enums']['pick_outcome'] | null;
          season_year: number | null;
          user_id: string | null;
          week_number: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'league_ats_base';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'player_rating_inputs';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'ui_games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      leaderboard_season_totals: {
        Row: {
          avatar_key: string | null;
          decisions: number | null;
          display_name: string | null;
          group_id: string | null;
          losses: number | null;
          missed: number | null;
          pushes: number | null;
          rank: number | null;
          season_year: number | null;
          total_points: number | null;
          user_id: string | null;
          wins: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      leaderboard_weekly_cumulative: {
        Row: {
          cumulative_points: number | null;
          cumulative_rank_this_week: number | null;
          display_name: string | null;
          group_id: string | null;
          season_total: number | null;
          season_year: number | null;
          user_id: string | null;
          week_losses: number | null;
          week_missed: number | null;
          week_number: number | null;
          week_points: number | null;
          week_pushes: number | null;
          week_wins: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      league_ats_base: {
        Row: {
          ats_result: string | null;
          commence_time: string | null;
          game_id: string | null;
          is_favorite: boolean | null;
          is_home: boolean | null;
          margin: number | null;
          opponent_team_id: number | null;
          season_year: number | null;
          spread_value: number | null;
          su_result: string | null;
          team_id: number | null;
          week_number: number | null;
        };
        Relationships: [];
      };
      league_ats_divisional: {
        Row: {
          favorite_covers: number | null;
          games: number | null;
          is_divisional: boolean | null;
          pushes: number | null;
          season_year: number | null;
          underdog_covers: number | null;
        };
        Relationships: [];
      };
      league_ats_fav_dog: {
        Row: {
          favorite_covers: number | null;
          games: number | null;
          pushes: number | null;
          season_year: number | null;
          underdog_covers: number | null;
          week_number: number | null;
        };
        Relationships: [];
      };
      league_ats_home_away: {
        Row: {
          away_ats_covers: number | null;
          away_ats_losses: number | null;
          away_ats_pushes: number | null;
          away_games: number | null;
          away_su_losses: number | null;
          away_su_pushes: number | null;
          away_su_wins: number | null;
          home_ats_covers: number | null;
          home_ats_losses: number | null;
          home_ats_pushes: number | null;
          home_games: number | null;
          home_su_losses: number | null;
          home_su_pushes: number | null;
          home_su_wins: number | null;
          season_year: number | null;
        };
        Relationships: [];
      };
      league_ats_primetime: {
        Row: {
          favorite_covers: number | null;
          games: number | null;
          pushes: number | null;
          season_year: number | null;
          slot: string | null;
          underdog_covers: number | null;
        };
        Relationships: [];
      };
      league_ats_quadrants: {
        Row: {
          ats_losses: number | null;
          ats_pushes: number | null;
          ats_wins: number | null;
          games: number | null;
          is_favorite: boolean | null;
          is_home: boolean | null;
          season_year: number | null;
        };
        Relationships: [];
      };
      league_ats_situational: {
        Row: {
          ats_losses: number | null;
          ats_pushes: number | null;
          ats_wins: number | null;
          games: number | null;
          is_favorite: boolean | null;
          is_home: boolean | null;
          season_year: number | null;
          team_id: number | null;
        };
        Relationships: [];
      };
      league_ats_spread_buckets: {
        Row: {
          bucket: string | null;
          bucket_order: number | null;
          favorite_covers: number | null;
          games: number | null;
          pushes: number | null;
          season_year: number | null;
          underdog_covers: number | null;
        };
        Relationships: [];
      };
      league_ats_streaks: {
        Row: {
          last4_losses: number | null;
          last4_pushes: number | null;
          last4_wins: number | null;
          season_year: number | null;
          streak_length: number | null;
          streak_result: string | null;
          team_id: number | null;
          team_name: string | null;
          team_short_name: string | null;
        };
        Relationships: [];
      };
      league_ats_team: {
        Row: {
          ats_losses: number | null;
          ats_pushes: number | null;
          ats_wins: number | null;
          away_ats_losses: number | null;
          away_ats_pushes: number | null;
          away_ats_wins: number | null;
          dog_ats_losses: number | null;
          dog_ats_pushes: number | null;
          dog_ats_wins: number | null;
          fav_ats_losses: number | null;
          fav_ats_pushes: number | null;
          fav_ats_wins: number | null;
          games: number | null;
          home_ats_losses: number | null;
          home_ats_pushes: number | null;
          home_ats_wins: number | null;
          season_year: number | null;
          su_losses: number | null;
          su_pushes: number | null;
          su_wins: number | null;
          team_id: number | null;
          team_name: string | null;
          team_short_name: string | null;
        };
        Relationships: [];
      };
      league_completed_standings: {
        Row: {
          avatar_key: string | null;
          decisions: number | null;
          display_name: string | null;
          group_id: string | null;
          losses: number | null;
          missed: number | null;
          pushes: number | null;
          rank: number | null;
          season_year: number | null;
          total_points: number | null;
          user_id: string | null;
          wins: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      league_situational_baseline: {
        Row: {
          accuracy: number | null;
          bucket: string | null;
          bucket_order: number | null;
          decisions: number | null;
          dimension: string | null;
          losses: number | null;
          pushes: number | null;
          wins: number | null;
        };
        Relationships: [];
      };
      league_situational_baseline_season: {
        Row: {
          accuracy: number | null;
          bucket: string | null;
          bucket_order: number | null;
          decisions: number | null;
          dimension: string | null;
          losses: number | null;
          pushes: number | null;
          season_year: number | null;
          wins: number | null;
        };
        Relationships: [];
      };
      picks_group_view: {
        Row: {
          avatar_key: string | null;
          commence_time: string | null;
          display_name: string | null;
          game_id: string | null;
          group_id: string | null;
          locked_at: string | null;
          locked_spread_team_id: number | null;
          locked_spread_value: number | null;
          picked_side: Database['public']['Enums']['side_enum'] | null;
          picked_team_id: number | null;
          picked_team_short: string | null;
          user_id: string | null;
          week_id: number | null;
          weight: Database['public']['Enums']['weight_enum'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'games_week_id_fkey';
            columns: ['week_id'];
            isOneToOne: false;
            referencedRelation: 'weeks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'league_ats_base';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'player_rating_inputs';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'ui_games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_picked_team_id_fkey';
            columns: ['picked_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      picks_status_view_admin: {
        Row: {
          commence_time: string | null;
          game_id: string | null;
          game_started: boolean | null;
          group_id: string | null;
          locked_at: string | null;
          locked_spread_team_id: number | null;
          locked_spread_value: number | null;
          picked_side: Database['public']['Enums']['side_enum'] | null;
          picked_team_id: number | null;
          picked_team_short: string | null;
          user_display_name: string | null;
          user_id: string | null;
          week_id: number | null;
          weight: Database['public']['Enums']['weight_enum'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'games_week_id_fkey';
            columns: ['week_id'];
            isOneToOne: false;
            referencedRelation: 'weeks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'league_ats_base';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'player_rating_inputs';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'ui_games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_picked_team_id_fkey';
            columns: ['picked_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      picks_status_view_user: {
        Row: {
          commence_time: string | null;
          game_id: string | null;
          game_started: boolean | null;
          group_id: string | null;
          locked_at: string | null;
          locked_spread_team_id: number | null;
          locked_spread_value: number | null;
          picked_side: Database['public']['Enums']['side_enum'] | null;
          picked_team_id: number | null;
          picked_team_short: string | null;
          user_id: string | null;
          week_id: number | null;
          weight: Database['public']['Enums']['weight_enum'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'games_week_id_fkey';
            columns: ['week_id'];
            isOneToOne: false;
            referencedRelation: 'weeks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'league_ats_base';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'player_rating_inputs';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'picks_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'ui_games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_picked_team_id_fkey';
            columns: ['picked_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      player_rating_inputs: {
        Row: {
          commence_time: string | null;
          game_id: string | null;
          group_id: string | null;
          outcome: Database['public']['Enums']['pick_outcome'] | null;
          season_year: number | null;
          user_id: string | null;
          weight: Database['public']['Enums']['weight_enum'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      stats_accuracy_by_line_side: {
        Row: {
          chalk_picks: number | null;
          decisions: number | null;
          display_name: string | null;
          dog_picks: number | null;
          group_id: string | null;
          season_year: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      stats_accuracy_by_team: {
        Row: {
          accuracy: number | null;
          decisions: number | null;
          display_name: string | null;
          group_id: string | null;
          losses: number | null;
          points: number | null;
          pushes: number | null;
          season_year: number | null;
          team_id: number | null;
          team_name: string | null;
          team_short_name: string | null;
          user_id: string | null;
          wins: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_picked_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          }
        ];
      };
      stats_accuracy_by_team_alltime: {
        Row: {
          accuracy: number | null;
          decisions: number | null;
          display_name: string | null;
          group_id: string | null;
          losses: number | null;
          points: number | null;
          pushes: number | null;
          team_id: number | null;
          team_name: string | null;
          team_short_name: string | null;
          user_id: string | null;
          wins: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_picked_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          }
        ];
      };
      stats_accuracy_by_weight: {
        Row: {
          accuracy: number | null;
          decisions: number | null;
          display_name: string | null;
          group_id: string | null;
          losses: number | null;
          points: number | null;
          pushes: number | null;
          season_year: number | null;
          user_id: string | null;
          weight: Database['public']['Enums']['weight_enum'] | null;
          wins: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      stats_accuracy_by_weight_alltime: {
        Row: {
          accuracy: number | null;
          decisions: number | null;
          display_name: string | null;
          group_id: string | null;
          losses: number | null;
          points: number | null;
          pushes: number | null;
          user_id: string | null;
          weight: Database['public']['Enums']['weight_enum'] | null;
          wins: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      stats_alltime_totals: {
        Row: {
          decisions: number | null;
          display_name: string | null;
          group_id: string | null;
          losses: number | null;
          missed: number | null;
          pushes: number | null;
          total_points: number | null;
          user_id: string | null;
          wins: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      stats_head_to_head: {
        Row: {
          display_name: string | null;
          games_compared: number | null;
          group_id: string | null;
          losses: number | null;
          opponent_display_name: string | null;
          opponent_points: number | null;
          opponent_user_id: string | null;
          points: number | null;
          pushes: number | null;
          season_year: number | null;
          user_id: string | null;
          wins: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      stats_head_to_head_alltime: {
        Row: {
          display_name: string | null;
          games_compared: number | null;
          group_id: string | null;
          losses: number | null;
          opponent_display_name: string | null;
          opponent_points: number | null;
          opponent_user_id: string | null;
          points: number | null;
          pushes: number | null;
          user_id: string | null;
          wins: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      stats_pick_streaks: {
        Row: {
          current_streak: number | null;
          display_name: string | null;
          graded_picks: number | null;
          group_id: string | null;
          max_streak: number | null;
          season_year: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      stats_season_trend: {
        Row: {
          cumulative_points: number | null;
          cumulative_rank_this_week: number | null;
          display_name: string | null;
          group_id: string | null;
          is_dropped_week: boolean | null;
          season_total: number | null;
          season_year: number | null;
          user_id: string | null;
          week_losses: number | null;
          week_missed: number | null;
          week_number: number | null;
          week_points: number | null;
          week_pushes: number | null;
          week_wins: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      stats_situational_base: {
        Row: {
          game_id: string | null;
          group_id: string | null;
          is_divisional: boolean | null;
          is_home_pick: boolean | null;
          is_primetime: boolean | null;
          outcome: Database['public']['Enums']['pick_outcome'] | null;
          season_year: number | null;
          spread_bucket_order: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'league_ats_base';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'player_rating_inputs';
            referencedColumns: ['game_id'];
          },
          {
            foreignKeyName: 'pick_settlement_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'ui_games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pick_settlement_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          }
        ];
      };
      stats_situational_splits: {
        Row: {
          accuracy: number | null;
          bucket: string | null;
          bucket_order: number | null;
          decisions: number | null;
          dimension: string | null;
          group_id: string | null;
          losses: number | null;
          pushes: number | null;
          user_id: string | null;
          wins: number | null;
        };
        Relationships: [];
      };
      stats_situational_splits_season: {
        Row: {
          accuracy: number | null;
          bucket: string | null;
          bucket_order: number | null;
          decisions: number | null;
          dimension: string | null;
          group_id: string | null;
          losses: number | null;
          pushes: number | null;
          season_year: number | null;
          user_id: string | null;
          wins: number | null;
        };
        Relationships: [];
      };
      stats_team_book: {
        Row: {
          accuracy: number | null;
          decisions: number | null;
          display_name: string | null;
          group_id: string | null;
          losses: number | null;
          points: number | null;
          pushes: number | null;
          season_year: number | null;
          side: string | null;
          team_id: number | null;
          team_name: string | null;
          team_short_name: string | null;
          user_id: string | null;
          wins: number | null;
        };
        Relationships: [];
      };
      stats_team_book_alltime: {
        Row: {
          accuracy: number | null;
          decisions: number | null;
          display_name: string | null;
          group_id: string | null;
          losses: number | null;
          points: number | null;
          pushes: number | null;
          side: string | null;
          team_id: number | null;
          team_name: string | null;
          team_short_name: string | null;
          user_id: string | null;
          wins: number | null;
        };
        Relationships: [];
      };
      ui_games: {
        Row: {
          away: string | null;
          away_team_id: number | null;
          favorite_team_id: number | null;
          home: string | null;
          home_team_id: number | null;
          id: string | null;
          kickoff: string | null;
          spread_value: number | null;
          week_id: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'game_lines_spread_team_id_fkey';
            columns: ['favorite_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'games_away_team_id_fkey';
            columns: ['away_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'games_home_team_id_fkey';
            columns: ['home_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'games_week_id_fkey';
            columns: ['week_id'];
            isOneToOne: false;
            referencedRelation: 'weeks';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Functions: {
      _capture_closing_line: {
        Args: { p_game_ids: string[] };
        Returns: undefined;
      };
      _get_final_week_unlimited_allin: { Args: never; Returns: boolean };
      _grade_games_by_ids: {
        Args: { p_game_ids: string[] };
        Returns: undefined;
      };
      _participation_start: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: string;
      };
      _rebuild_player_ratings: {
        Args: { p_computed_at: string; p_rows: Json };
        Returns: undefined;
      };
      _settlement_owed: { Args: { p_game_id: string }; Returns: boolean };
      advance_week_if_complete: { Args: never; Returns: Json };
      all_in_declarations: {
        Args: { p_group_id: string; p_week_id: number };
        Returns: {
          avatar_key: string;
          commence_time: string;
          display_name: string;
          game_id: string;
          group_id: string;
          locked_at: string;
          picked_side: Database['public']['Enums']['side_enum'];
          picked_team_id: number;
          picked_team_short: string;
          user_id: string;
          week_id: number;
          weight: Database['public']['Enums']['weight_enum'];
        }[];
      };
      ats_margin_at_lock: {
        Args: {
          away_id: number;
          away_pts: number;
          home_id: number;
          home_pts: number;
          spread_team_id: number;
          spread_value: number;
        };
        Returns: number;
      };
      attach_line_to_matchup: {
        Args: {
          p_away_team_id: number;
          p_external_game_id: string;
          p_home_team_id: number;
          p_week_id: number;
        };
        Returns: string;
      };
      audit_log_action: {
        Args: { p_action: string; p_actor: string; p_details: Json };
        Returns: undefined;
      };
      competition_start_frozen: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      create_group: {
        Args: { p_competition_starts_at?: string; p_name: string };
        Returns: string;
      };
      find_unsettled_weeks: {
        Args: never;
        Returns: {
          id: number;
        }[];
      };
      game_has_started: { Args: { p_game_id: string }; Returns: boolean };
      grade_game: { Args: { p_game_id: string }; Returns: undefined };
      grade_pick: {
        Args: {
          away_id: number;
          away_pts: number;
          home_id: number;
          home_pts: number;
          picked_team_id: number;
          spread_team_id: number;
          spread_value: number;
          weight: string;
        };
        Returns: {
          outcome: Database['public']['Enums']['pick_outcome'];
          points_delta: number;
        }[];
      };
      grade_season: { Args: { p_season_id: number }; Returns: undefined };
      grade_week: { Args: { p_week_id: number }; Returns: undefined };
      group_active_season_settled: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      group_members_page: {
        Args: {
          p_after_joined_at?: string;
          p_after_role?: Database['public']['Enums']['group_membership_role'];
          p_after_user_id?: string;
          p_group_id: string;
          p_limit?: number;
        };
        Returns: {
          avatar_key: string;
          display_name: string;
          group_id: string;
          joined_at: string;
          role: Database['public']['Enums']['group_membership_role'];
          user_id: string;
        }[];
      };
      group_season_years: { Args: { p_group_id: string }; Returns: number[] };
      is_admin: { Args: never; Returns: boolean };
      is_commissioner: { Args: { target_group_id: string }; Returns: boolean };
      is_member: { Args: { target_group_id: string }; Returns: boolean };
      leaderboard_season_page: {
        Args: {
          p_after_pushes?: number;
          p_after_total_points?: number;
          p_after_user_id?: string;
          p_after_wins?: number;
          p_group_id: string;
          p_limit?: number;
          p_season_year: number;
        };
        Returns: {
          avatar_key: string | null;
          decisions: number | null;
          display_name: string | null;
          group_id: string | null;
          losses: number | null;
          missed: number | null;
          pushes: number | null;
          rank: number | null;
          season_year: number | null;
          total_points: number | null;
          user_id: string | null;
          wins: number | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'leaderboard_season_totals';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      leave_group: { Args: { p_group_id: string }; Returns: undefined };
      lock_pick: {
        Args: {
          p_game_id: string;
          p_side: Database['public']['Enums']['side_enum'];
          p_source?: string;
          p_weight: Database['public']['Enums']['weight_enum'];
        };
        Returns: {
          game_id: string;
          locked_at: string;
          ok: boolean;
          picked_side: Database['public']['Enums']['side_enum'];
          user_id: string;
          weight: Database['public']['Enums']['weight_enum'];
        }[];
      };
      lock_pick_all_groups: {
        Args: {
          p_game_id: string;
          p_side: Database['public']['Enums']['side_enum'];
          p_weight: Database['public']['Enums']['weight_enum'];
        };
        Returns: {
          group_id: string;
          locked_at: string;
          ok: boolean;
          reason: string;
        }[];
      };
      mint_invite: {
        Args: { p_expires_at?: string; p_group_id: string; p_max_uses?: number };
        Returns: string;
      };
      picks_status_board: {
        Args: { p_group_id: string; p_week_id: number };
        Returns: {
          avatar_key: string;
          display_name: string;
          games_available: number;
          group_id: string;
          is_complete: boolean;
          picks_made: number;
          user_id: string;
        }[];
      };
      preview_invite: { Args: { p_code: string }; Returns: Json };
      promote_member: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: undefined;
      };
      redeem_invite: { Args: { p_code: string }; Returns: undefined };
      refresh_leaderboard_stats: { Args: never; Returns: undefined };
      remove_member: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: undefined;
      };
      rename_group: {
        Args: { p_group_id: string; p_name: string };
        Returns: undefined;
      };
      resolve_missed_penalty_for_game: {
        Args: { p_game_id: string };
        Returns: number;
      };
      set_active_line: {
        Args: {
          p_game_id: string;
          p_source?: string;
          p_spread_team_id: number;
          p_spread_value: number;
        };
        Returns: Json;
      };
      set_competition_start: {
        Args: { p_group_id: string; p_starts_at?: string };
        Returns: string;
      };
      unlock_pick: {
        Args: { p_game_id: string };
        Returns: {
          game_id: string;
          ok: boolean;
          unlocked_at: string;
          user_id: string;
        }[];
      };
      unlock_pick_all_groups: {
        Args: { p_game_id: string };
        Returns: {
          group_id: string;
          ok: boolean;
          reason: string;
        }[];
      };
      update_group_config: {
        Args: {
          p_drop_worst_week?: boolean;
          p_drop_worst_week_start_year?: number;
          p_grading_preset?: string;
          p_group_id: string;
        };
        Returns: undefined;
      };
      update_group_recap_settings: {
        Args: {
          p_ai_recaps_enabled?: boolean;
          p_group_id: string;
          p_spice?: string;
        };
        Returns: undefined;
      };
      update_recap_opt_out: {
        Args: { p_ai_recap_opt_out: boolean; p_group_id: string };
        Returns: undefined;
      };
      upsert_game_by_external_id: {
        Args: {
          p_away_team_id: number;
          p_commence: string;
          p_external_game_id: string;
          p_home_team_id: number;
          p_week_id: number;
        };
        Returns: string;
      };
      upsert_game_by_matchup: {
        Args: {
          p_away_team_id: number;
          p_commence: string;
          p_home_team_id: number;
          p_schedule_game_id: string;
          p_status?: string;
          p_week_id: number;
        };
        Returns: string;
      };
      weight_points: { Args: { p_weight: string }; Returns: number };
    };
    Enums: {
      cover_side: 'home' | 'away' | 'push';
      group_membership_role: 'commissioner' | 'member';
      group_membership_status: 'active' | 'pending';
      pick_outcome: 'win' | 'loss' | 'push' | 'missed';
      side_enum: 'home' | 'away';
      weight_enum: 'L' | 'M' | 'H' | 'A';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {}
  },
  public: {
    Enums: {
      cover_side: ['home', 'away', 'push'],
      group_membership_role: ['commissioner', 'member'],
      group_membership_status: ['active', 'pending'],
      pick_outcome: ['win', 'loss', 'push', 'missed'],
      side_enum: ['home', 'away'],
      weight_enum: ['L', 'M', 'H', 'A']
    }
  }
} as const;

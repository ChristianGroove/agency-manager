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
      agent_availability: {
        Row: {
          agent_id: string
          auto_assign_enabled: boolean | null
          created_at: string | null
          current_load: number | null
          last_seen_at: string | null
          max_capacity: number | null
          organization_id: string
          status: string | null
          timezone: string | null
          updated_at: string | null
          work_schedule: Json | null
        }
        Insert: {
          agent_id: string
          auto_assign_enabled?: boolean | null
          created_at?: string | null
          current_load?: number | null
          last_seen_at?: string | null
          max_capacity?: number | null
          organization_id: string
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          work_schedule?: Json | null
        }
        Update: {
          agent_id?: string
          auto_assign_enabled?: boolean | null
          created_at?: string | null
          current_load?: number | null
          last_seen_at?: string | null
          max_capacity?: number | null
          organization_id?: string
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          work_schedule?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_availability_new_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "agent_availability_new_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_availability_new_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      agent_availability_backup_before_sync: {
        Row: {
          agent_id: string | null
          auto_assign_enabled: boolean | null
          created_at: string | null
          current_load: number | null
          id: string | null
          last_seen_at: string | null
          max_capacity: number | null
          organization_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          auto_assign_enabled?: boolean | null
          created_at?: string | null
          current_load?: number | null
          id?: string | null
          last_seen_at?: string | null
          max_capacity?: number | null
          organization_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          auto_assign_enabled?: boolean | null
          created_at?: string | null
          current_load?: number | null
          id?: string | null
          last_seen_at?: string | null
          max_capacity?: number | null
          organization_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_channels: {
        Row: {
          agent_id: string
          channel_type: string
          created_at: string | null
          is_active: boolean | null
          organization_id: string
        }
        Insert: {
          agent_id: string
          channel_type: string
          created_at?: string | null
          is_active?: boolean | null
          organization_id: string
        }
        Update: {
          agent_id?: string
          channel_type?: string
          created_at?: string | null
          is_active?: boolean | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_channels_agent_fkey"
            columns: ["organization_id", "agent_id"]
            isOneToOne: false
            referencedRelation: "agent_availability"
            referencedColumns: ["organization_id", "agent_id"]
          },
          {
            foreignKeyName: "agent_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "agent_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      agent_presence: {
        Row: {
          last_seen: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          last_seen?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          last_seen?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_qa_reports: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          messages_analyzed_count: number | null
          organization_id: string
          period_end: string | null
          period_start: string | null
          report: Json
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          messages_analyzed_count?: number | null
          organization_id: string
          period_end?: string | null
          period_start?: string | null
          report: Json
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          messages_analyzed_count?: number | null
          organization_id?: string
          period_end?: string | null
          period_start?: string | null
          report?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agent_qa_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "agent_qa_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_qa_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      agent_skills: {
        Row: {
          agent_id: string
          created_at: string | null
          organization_id: string
          proficiency: number | null
          skill: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          organization_id: string
          proficiency?: number | null
          skill: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          organization_id?: string
          proficiency?: number | null
          skill?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_skills_new_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "agent_skills_new_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_skills_new_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      agent_skills_backup_before_sync: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string | null
          organization_id: string | null
          proficiency: number | null
          skill: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string | null
          organization_id?: string | null
          proficiency?: number | null
          skill?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string | null
          organization_id?: string | null
          proficiency?: number | null
          skill?: string | null
        }
        Relationships: []
      }
      agent_status_history: {
        Row: {
          agent_id: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          metadata: Json | null
          organization_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          agent_id: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          started_at?: string | null
          status: string
        }
        Update: {
          agent_id?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "agent_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      ai_cache: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          organization_id: string
          payload_hash: string
          response_data: Json
          task_type: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          organization_id: string
          payload_hash: string
          response_data: Json
          task_type: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string
          payload_hash?: string
          response_data?: Json
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ai_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      ai_credentials: {
        Row: {
          api_key_encrypted: string
          created_at: string | null
          exhausted_until: string | null
          id: string
          monthly_limit_credits: number | null
          organization_id: string
          priority: number | null
          provider_id: string
          status: string | null
          updated_at: string | null
          used_credits_current_month: number | null
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string | null
          exhausted_until?: string | null
          id?: string
          monthly_limit_credits?: number | null
          organization_id: string
          priority?: number | null
          provider_id: string
          status?: string | null
          updated_at?: string | null
          used_credits_current_month?: number | null
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string | null
          exhausted_until?: string | null
          id?: string
          monthly_limit_credits?: number | null
          organization_id?: string
          priority?: number | null
          provider_id?: string
          status?: string | null
          updated_at?: string | null
          used_credits_current_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ai_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ai_credentials_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_image_generation_logs: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          model_used: string | null
          organization_id: string | null
          prompt_used: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          model_used?: string | null
          organization_id?: string | null
          prompt_used?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          model_used?: string | null
          organization_id?: string | null
          prompt_used?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_image_generation_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ai_image_generation_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_image_generation_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          base_url: string | null
          capabilities: Json | null
          created_at: string | null
          id: string
          logo_url: string | null
          models: Json | null
          name: string
          type: string
        }
        Insert: {
          base_url?: string | null
          capabilities?: Json | null
          created_at?: string | null
          id: string
          logo_url?: string | null
          models?: Json | null
          name: string
          type: string
        }
        Update: {
          base_url?: string | null
          capabilities?: Json | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          models?: Json | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          daily_token_limit: number | null
          id: string
          is_clawdbot_enabled: boolean | null
          model_overrides: Json | null
          monthly_budget_usd: number | null
          scope_id: string
          scope_type: string
        }
        Insert: {
          daily_token_limit?: number | null
          id?: string
          is_clawdbot_enabled?: boolean | null
          model_overrides?: Json | null
          monthly_budget_usd?: number | null
          scope_id: string
          scope_type: string
        }
        Update: {
          daily_token_limit?: number | null
          id?: string
          is_clawdbot_enabled?: boolean | null
          model_overrides?: Json | null
          monthly_budget_usd?: number | null
          scope_id?: string
          scope_type?: string
        }
        Relationships: []
      }
      ai_suggestions: {
        Row: {
          context_messages_count: number | null
          conversation_id: string
          created_at: string | null
          final_message: string | null
          generation_time_ms: number | null
          id: string
          message_id: string | null
          model_used: string | null
          selected_response: string | null
          suggested_responses: Json
          used_at: string | null
          was_edited: boolean | null
        }
        Insert: {
          context_messages_count?: number | null
          conversation_id: string
          created_at?: string | null
          final_message?: string | null
          generation_time_ms?: number | null
          id?: string
          message_id?: string | null
          model_used?: string | null
          selected_response?: string | null
          suggested_responses?: Json
          used_at?: string | null
          was_edited?: boolean | null
        }
        Update: {
          context_messages_count?: number | null
          conversation_id?: string
          created_at?: string | null
          final_message?: string | null
          generation_time_ms?: number | null
          id?: string
          message_id?: string | null
          model_used?: string | null
          selected_response?: string | null
          suggested_responses?: Json
          used_at?: string | null
          was_edited?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          cost_estimated: number | null
          created_at: string | null
          credential_id: string | null
          error_message: string | null
          id: string
          input_tokens: number | null
          model: string
          organization_id: string
          output_tokens: number | null
          provider_id: string
          status: string | null
          task_type: string
        }
        Insert: {
          cost_estimated?: number | null
          created_at?: string | null
          credential_id?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          model: string
          organization_id: string
          output_tokens?: number | null
          provider_id: string
          status?: string | null
          task_type: string
        }
        Update: {
          cost_estimated?: number | null
          created_at?: string | null
          credential_id?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          model?: string
          organization_id?: string
          output_tokens?: number | null
          provider_id?: string
          status?: string | null
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "ai_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ai_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      assignment_history: {
        Row: {
          assigned_to: string | null
          assignment_method: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          organization_id: string
          rule_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          assignment_method?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          organization_id: string
          rule_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          assignment_method?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string
          rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "assignment_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "assignment_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "assignment_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_rules: {
        Row: {
          assign_to: string[] | null
          conditions: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          priority: number | null
          strategy: string | null
          updated_at: string | null
        }
        Insert: {
          assign_to?: string[] | null
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          priority?: number | null
          strategy?: string | null
          updated_at?: string | null
        }
        Update: {
          assign_to?: string[] | null
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          priority?: number | null
          strategy?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "assignment_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          accuracy_meters: number | null
          created_at: string
          device_lat: number | null
          device_lng: number | null
          device_metadata: Json | null
          distance_to_location: number | null
          fraud_flags: string[] | null
          id: string
          is_valid: boolean | null
          location_id: string | null
          notes: string | null
          organization_id: string
          photo_url: string
          staff_id: string
          timestamp: string
          type: string
        }
        Insert: {
          accuracy_meters?: number | null
          created_at?: string
          device_lat?: number | null
          device_lng?: number | null
          device_metadata?: Json | null
          distance_to_location?: number | null
          fraud_flags?: string[] | null
          id?: string
          is_valid?: boolean | null
          location_id?: string | null
          notes?: string | null
          organization_id: string
          photo_url: string
          staff_id: string
          timestamp?: string
          type: string
        }
        Update: {
          accuracy_meters?: number | null
          created_at?: string
          device_lat?: number | null
          device_lng?: number | null
          device_metadata?: Json | null
          distance_to_location?: number | null
          fraud_flags?: string[] | null
          id?: string
          is_valid?: boolean | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          photo_url?: string
          staff_id?: string
          timestamp?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "attendance_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "attendance_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "organization_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_shifts: {
        Row: {
          created_at: string
          date: string
          extra_minutes_approved: number | null
          extra_minutes_pending: number | null
          first_in: string | null
          id: string
          last_out: string | null
          location_id: string | null
          ordinary_minutes: number | null
          organization_id: string
          staff_id: string
          status: string | null
          total_break_minutes: number | null
          total_worked_minutes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          extra_minutes_approved?: number | null
          extra_minutes_pending?: number | null
          first_in?: string | null
          id?: string
          last_out?: string | null
          location_id?: string | null
          ordinary_minutes?: number | null
          organization_id: string
          staff_id: string
          status?: string | null
          total_break_minutes?: number | null
          total_worked_minutes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          extra_minutes_approved?: number | null
          extra_minutes_pending?: number | null
          first_in?: string | null
          id?: string
          last_out?: string | null
          location_id?: string | null
          ordinary_minutes?: number | null
          organization_id?: string
          staff_id?: string
          status?: string | null
          total_break_minutes?: number | null
          total_worked_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "attendance_shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "attendance_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "organization_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string | null
          execution_id: string
          id: string
          resume_at: string
          status: string
          step_id: string
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          execution_id: string
          id?: string
          resume_at: string
          status?: string
          step_id: string
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          execution_id?: string
          id?: string
          resume_at?: string
          status?: string
          step_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_queue_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      billable_events: {
        Row: {
          amount: number
          client_age_months: number
          commission_calculated: number | null
          commission_phase: string | null
          commission_rule_id: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          event_date: string
          event_type: string
          id: string
          invoice_id: string | null
          organization_id: string
          reseller_chain: Json
          settled: boolean | null
          settlement_id: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          client_age_months?: number
          commission_calculated?: number | null
          commission_phase?: string | null
          commission_rule_id?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          event_date?: string
          event_type: string
          id?: string
          invoice_id?: string | null
          organization_id: string
          reseller_chain?: Json
          settled?: boolean | null
          settlement_id?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          client_age_months?: number
          commission_calculated?: number | null
          commission_phase?: string | null
          commission_rule_id?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          invoice_id?: string | null
          organization_id?: string
          reseller_chain?: Json
          settled?: boolean | null
          settlement_id?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billable_events_commission_rule_id_fkey"
            columns: ["commission_rule_id"]
            isOneToOne: false
            referencedRelation: "revenue_share_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billable_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "billable_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billable_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      billing_audit_log: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          changes: string[] | null
          document_id: string | null
          hash: string
          id: string
          ip_address: unknown
          organization_id: string
          previous_hash: string | null
          source: string
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          changes?: string[] | null
          document_id?: string | null
          hash: string
          id?: string
          ip_address?: unknown
          organization_id: string
          previous_hash?: string | null
          source: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          changes?: string[] | null
          document_id?: string | null
          hash?: string
          id?: string
          ip_address?: unknown
          organization_id?: string
          previous_hash?: string | null
          source?: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      billing_cycles: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          end_date: string
          id: string
          invoice_id: string | null
          metadata: Json | null
          service_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          end_date: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          service_id: string
          start_date: string
          status: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          end_date?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          service_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_cycles_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_cycles_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_overage_rates: {
        Row: {
          created_at: string
          currency: string | null
          engine: string
          id: string
          organization_id: string | null
          organization_type: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          currency?: string | null
          engine: string
          id?: string
          organization_id?: string | null
          organization_type?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string
          currency?: string | null
          engine?: string
          id?: string
          organization_id?: string | null
          organization_type?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_overage_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "billing_overage_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_overage_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      billing_packages: {
        Row: {
          code: string
          created_at: string
          description: string | null
          engine: string
          id: string
          is_active: boolean | null
          limit_value: number
          name: string
          period: string
          price_monthly: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          engine: string
          id?: string
          is_active?: boolean | null
          limit_value: number
          name: string
          period?: string
          price_monthly?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          engine?: string
          id?: string
          is_active?: boolean | null
          limit_value?: number
          name?: string
          period?: string
          price_monthly?: number | null
        }
        Relationships: []
      }
      billing_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          package_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          package_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          package_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "billing_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "billing_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "billing_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_tiers: {
        Row: {
          capabilities: Json | null
          created_at: string | null
          description: string | null
          display_name: string
          features: Json
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number
          restrictions: Json
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          capabilities?: Json | null
          created_at?: string | null
          description?: string | null
          display_name: string
          features?: Json
          id: string
          is_active?: boolean | null
          name: string
          price_monthly?: number
          restrictions?: Json
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          capabilities?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          features?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number
          restrictions?: Json
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      briefing_fields: {
        Row: {
          created_at: string | null
          help_text: string | null
          id: string
          label: string
          name: string
          options: Json | null
          order_index: number
          placeholder: string | null
          required: boolean | null
          step_id: string | null
          type: Database["public"]["Enums"]["briefing_field_type"]
        }
        Insert: {
          created_at?: string | null
          help_text?: string | null
          id?: string
          label: string
          name: string
          options?: Json | null
          order_index: number
          placeholder?: string | null
          required?: boolean | null
          step_id?: string | null
          type: Database["public"]["Enums"]["briefing_field_type"]
        }
        Update: {
          created_at?: string | null
          help_text?: string | null
          id?: string
          label?: string
          name?: string
          options?: Json | null
          order_index?: number
          placeholder?: string | null
          required?: boolean | null
          step_id?: string | null
          type?: Database["public"]["Enums"]["briefing_field_type"]
        }
        Relationships: [
          {
            foreignKeyName: "briefing_fields_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "briefing_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_responses: {
        Row: {
          briefing_id: string | null
          created_at: string | null
          field_id: string | null
          id: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          briefing_id?: string | null
          created_at?: string | null
          field_id?: string | null
          id?: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          briefing_id?: string | null
          created_at?: string | null
          field_id?: string | null
          id?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "briefing_responses_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "briefings"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_steps: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          order_index: number
          template_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          order_index: number
          template_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefing_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "briefing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          slug: string
          structure: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          slug: string
          structure?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          slug?: string
          structure?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "briefing_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "briefing_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefing_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      briefings: {
        Row: {
          client_id: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          metadata: Json | null
          organization_id: string
          service_id: string | null
          status: Database["public"]["Enums"]["briefing_status"] | null
          template_id: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["briefing_status"] | null
          template_id?: string | null
          token?: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["briefing_status"] | null
          template_id?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "briefings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "briefings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "briefings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "briefing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_recipients: {
        Row: {
          broadcast_id: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          lead_id: string
          read_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          broadcast_id: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          lead_id: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          broadcast_id?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          campaign_id: string | null
          channel: string
          completed_at: string | null
          created_at: string | null
          delivered_count: number | null
          failed_count: number | null
          filters: Json | null
          id: string
          message: string
          name: string
          organization_id: string
          read_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          channel?: string
          completed_at?: string | null
          created_at?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          filters?: Json | null
          id?: string
          message: string
          name: string
          organization_id: string
          read_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          channel?: string
          completed_at?: string | null
          created_at?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          filters?: Json | null
          id?: string
          message?: string
          name?: string
          organization_id?: string
          read_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "broadcasts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          product_id: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          cart_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Update: {
          cart_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "deal_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_definitions: {
        Row: {
          created_at: string | null
          is_active: boolean | null
          metadata: Json | null
          name: string
          provider_key: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          provider_key?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          provider_key?: string | null
          slug?: string
        }
        Relationships: []
      }
      channels: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          identifier: string
          is_default: boolean | null
          name: string | null
          organization_id: string
          provider: string
          provider_channel_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          identifier: string
          is_default?: boolean | null
          name?: string | null
          organization_id: string
          provider: string
          provider_channel_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          identifier?: string
          is_default?: boolean | null
          name?: string | null
          organization_id?: string
          provider?: string
          provider_channel_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      client_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "client_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      client_events: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          metadata: Json | null
          title: string
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          title: string
          type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          avatar_url: string | null
          category_id: string | null
          company_name: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          logo_url: string | null
          name: string
          nit: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          portal_config: Json | null
          portal_insights_settings: Json | null
          portal_short_token: string | null
          portal_token: string | null
          portal_token_created_at: string | null
          portal_token_expires_at: string | null
          portal_token_never_expires: boolean | null
          tiktok: string | null
          twitter: string | null
          user_id: string | null
          website: string | null
          youtube: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          category_id?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name: string
          nit?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          portal_config?: Json | null
          portal_insights_settings?: Json | null
          portal_short_token?: string | null
          portal_token?: string | null
          portal_token_created_at?: string | null
          portal_token_expires_at?: string | null
          portal_token_never_expires?: boolean | null
          tiktok?: string | null
          twitter?: string | null
          user_id?: string | null
          website?: string | null
          youtube?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          category_id?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name?: string
          nit?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          portal_config?: Json | null
          portal_insights_settings?: Json | null
          portal_short_token?: string | null
          portal_token?: string | null
          portal_token_created_at?: string | null
          portal_token_expires_at?: string | null
          portal_token_never_expires?: boolean | null
          tiktok?: string | null
          twitter?: string | null
          user_id?: string | null
          website?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "client_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string | null
          content: Json
          created_at: string | null
          deleted_at: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          number: string | null
          organization_id: string
          pdf_url: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          vault_id: string | null
        }
        Insert: {
          client_id?: string | null
          content: Json
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          number?: string | null
          organization_id: string
          pdf_url?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          vault_id?: string | null
        }
        Update: {
          client_id?: string | null
          content?: Json
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          number?: string | null
          organization_id?: string
          pdf_url?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          vault_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      conversation_intents: {
        Row: {
          auto_routed: boolean | null
          confidence: number
          conversation_id: string
          detected_at: string | null
          extracted_entities: Json | null
          id: string
          intent: string
          message_id: string | null
          model_used: string | null
          processing_time_ms: number | null
          suggested_agent_skills: string[] | null
          suggested_team: string | null
        }
        Insert: {
          auto_routed?: boolean | null
          confidence: number
          conversation_id: string
          detected_at?: string | null
          extracted_entities?: Json | null
          id?: string
          intent: string
          message_id?: string | null
          model_used?: string | null
          processing_time_ms?: number | null
          suggested_agent_skills?: string[] | null
          suggested_team?: string | null
        }
        Update: {
          auto_routed?: boolean | null
          confidence?: number
          conversation_id?: string
          detected_at?: string | null
          extracted_entities?: Json | null
          id?: string
          intent?: string
          message_id?: string | null
          model_used?: string | null
          processing_time_ms?: number | null
          suggested_agent_skills?: string[] | null
          suggested_team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_intents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_intents_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          average_response_time_seconds: number | null
          channel: string
          client_id: string | null
          connection_id: string | null
          contact_profile: Json | null
          created_at: string | null
          id: string
          is_bot_active: boolean | null
          last_auto_reply_at: string | null
          last_message: string | null
          last_message_at: string | null
          last_message_direction: string | null
          last_message_preview: string | null
          last_responded_at: string | null
          lead_id: string | null
          metadata: Json | null
          organization_id: string
          overall_sentiment: string | null
          phone: string | null
          priority: string | null
          sentiment_trend: Json | null
          snoozed_until: string | null
          state: string | null
          status: string
          tags: string[] | null
          unread_count: number | null
          updated_at: string | null
          waiting_since: string | null
        }
        Insert: {
          assigned_to?: string | null
          average_response_time_seconds?: number | null
          channel: string
          client_id?: string | null
          connection_id?: string | null
          contact_profile?: Json | null
          created_at?: string | null
          id?: string
          is_bot_active?: boolean | null
          last_auto_reply_at?: string | null
          last_message?: string | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_preview?: string | null
          last_responded_at?: string | null
          lead_id?: string | null
          metadata?: Json | null
          organization_id: string
          overall_sentiment?: string | null
          phone?: string | null
          priority?: string | null
          sentiment_trend?: Json | null
          snoozed_until?: string | null
          state?: string | null
          status?: string
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string | null
          waiting_since?: string | null
        }
        Update: {
          assigned_to?: string | null
          average_response_time_seconds?: number | null
          channel?: string
          client_id?: string | null
          connection_id?: string | null
          contact_profile?: Json | null
          created_at?: string | null
          id?: string
          is_bot_active?: boolean | null
          last_auto_reply_at?: string | null
          last_message?: string | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_preview?: string | null
          last_responded_at?: string | null
          lead_id?: string | null
          metadata?: Json | null
          organization_id?: string
          overall_sentiment?: string | null
          phone?: string | null
          priority?: string | null
          sentiment_trend?: Json | null
          snoozed_until?: string | null
          state?: string | null
          status?: string
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string | null
          waiting_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      crm_lead_tags: {
        Row: {
          created_at: string | null
          lead_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          lead_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "crm_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          lead_id: string
          organization_id: string
          priority: string | null
          reminder_at: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          lead_id: string
          organization_id: string
          priority?: string | null
          reminder_at?: string | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          lead_id?: string
          organization_id?: string
          priority?: string | null
          reminder_at?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "crm_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      data_snapshots: {
        Row: {
          checksum: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          file_size_bytes: number | null
          id: string
          included_modules: string[] | null
          metadata: Json | null
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["snapshot_status"] | null
          storage_path: string | null
        }
        Insert: {
          checksum?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_size_bytes?: number | null
          id?: string
          included_modules?: string[] | null
          metadata?: Json | null
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["snapshot_status"] | null
          storage_path?: string | null
        }
        Update: {
          checksum?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_size_bytes?: number | null
          id?: string
          included_modules?: string[] | null
          metadata?: Json | null
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["snapshot_status"] | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "data_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      deal_carts: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          lead_id: string
          organization_id: string
          status: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          lead_id: string
          organization_id: string
          status?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          lead_id?: string
          organization_id?: string
          status?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_carts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_carts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_carts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "deal_carts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_carts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      dian_documents: {
        Row: {
          created_at: string
          cufe: string | null
          dian_message: string | null
          dian_response_xml: string | null
          dian_status: Database["public"]["Enums"]["dian_status"]
          environment: string
          id: string
          invoice_id: string
          organization_id: string
          track_id: string | null
          updated_at: string
          validation_errors: Json | null
          xml_signed: string | null
          xml_unsigned: string | null
        }
        Insert: {
          created_at?: string
          cufe?: string | null
          dian_message?: string | null
          dian_response_xml?: string | null
          dian_status?: Database["public"]["Enums"]["dian_status"]
          environment?: string
          id?: string
          invoice_id: string
          organization_id: string
          track_id?: string | null
          updated_at?: string
          validation_errors?: Json | null
          xml_signed?: string | null
          xml_unsigned?: string | null
        }
        Update: {
          created_at?: string
          cufe?: string | null
          dian_message?: string | null
          dian_response_xml?: string | null
          dian_status?: Database["public"]["Enums"]["dian_status"]
          environment?: string
          id?: string
          invoice_id?: string
          organization_id?: string
          track_id?: string | null
          updated_at?: string
          validation_errors?: Json | null
          xml_signed?: string | null
          xml_unsigned?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dian_documents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_events: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          payload: Json | null
          triggered_by: Database["public"]["Enums"]["event_trigger_type"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          payload?: Json | null
          triggered_by?: Database["public"]["Enums"]["event_trigger_type"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          payload?: Json | null
          triggered_by?: Database["public"]["Enums"]["event_trigger_type"]
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          name: string
          organization_id: string
          template_id: string | null
          time_offset: string | null
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          organization_id: string
          template_id?: string | null
          time_offset?: string | null
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          organization_id?: string
          template_id?: string | null
          time_offset?: string | null
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "email_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string | null
          design_config: Json | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          subject_template: string
          template_key: string
          updated_at: string | null
          variant_name: string | null
        }
        Insert: {
          body_html: string
          created_at?: string | null
          design_config?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          subject_template: string
          template_key: string
          updated_at?: string | null
          variant_name?: string | null
        }
        Update: {
          body_html?: string
          created_at?: string | null
          design_config?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          subject_template?: string
          template_key?: string
          updated_at?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      emitters: {
        Row: {
          address: string | null
          allowed_document_types: string[]
          created_at: string
          display_name: string
          email: string | null
          emitter_type: Database["public"]["Enums"]["emitter_type"]
          id: string
          identification_number: string
          identification_type: string
          is_active: boolean | null
          is_default: boolean | null
          legal_name: string
          logo_url: string | null
          organization_id: string | null
          phone: string | null
          verification_digit: string | null
        }
        Insert: {
          address?: string | null
          allowed_document_types?: string[]
          created_at?: string
          display_name: string
          email?: string | null
          emitter_type?: Database["public"]["Enums"]["emitter_type"]
          id?: string
          identification_number: string
          identification_type?: string
          is_active?: boolean | null
          is_default?: boolean | null
          legal_name: string
          logo_url?: string | null
          organization_id?: string | null
          phone?: string | null
          verification_digit?: string | null
        }
        Update: {
          address?: string | null
          allowed_document_types?: string[]
          created_at?: string
          display_name?: string
          email?: string | null
          emitter_type?: Database["public"]["Enums"]["emitter_type"]
          id?: string
          identification_number?: string
          identification_type?: string
          is_active?: boolean | null
          is_default?: boolean | null
          legal_name?: string
          logo_url?: string | null
          organization_id?: string | null
          phone?: string | null
          verification_digit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emitters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "emitters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emitters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          config: Json | null
          created_at: string | null
          enabled: boolean | null
          feature_key: string
          id: string
          module_key: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          feature_key: string
          id?: string
          module_key: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          feature_key?: string
          id?: string
          module_key?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      global_dashboard_banners: {
        Row: {
          created_at: string | null
          cta_text: string | null
          cta_url: string | null
          description: Json | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          layout_pos: string | null
          media_type: string | null
          media_url: string | null
          slides: Json | null
          space_type: string
          starts_at: string | null
          theme: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cta_text?: string | null
          cta_url?: string | null
          description?: Json | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          layout_pos?: string | null
          media_type?: string | null
          media_url?: string | null
          slides?: Json | null
          space_type: string
          starts_at?: string | null
          theme?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cta_text?: string | null
          cta_url?: string | null
          description?: Json | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          layout_pos?: string | null
          media_type?: string | null
          media_url?: string | null
          slides?: Json | null
          space_type?: string
          starts_at?: string | null
          theme?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hosting_accounts: {
        Row: {
          client_id: string | null
          cpanel_url: string | null
          created_at: string
          credentials: Json | null
          domain_url: string
          id: string
          organization_id: string
          plan_name: string | null
          provider_name: string | null
          renewal_date: string | null
          server_ip: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          cpanel_url?: string | null
          created_at?: string
          credentials?: Json | null
          domain_url: string
          id?: string
          organization_id: string
          plan_name?: string | null
          provider_name?: string | null
          renewal_date?: string | null
          server_ip?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          cpanel_url?: string | null
          created_at?: string
          credentials?: Json | null
          domain_url?: string
          id?: string
          organization_id?: string
          plan_name?: string | null
          provider_name?: string | null
          renewal_date?: string | null
          server_ip?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosting_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosting_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosting_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "hosting_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosting_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      integration_configs: {
        Row: {
          access_token: string
          ad_account_id: string | null
          client_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          page_id: string | null
          platform: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          ad_account_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          page_id?: string | null
          platform: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          ad_account_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          page_id?: string | null
          platform?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          auto_reply_when_offline: string | null
          config: Json | null
          connection_name: string
          created_at: string | null
          credentials: Json | null
          default_pipeline_stage_id: string | null
          id: string
          is_primary: boolean | null
          last_synced_at: string | null
          metadata: Json | null
          organization_id: string | null
          provider_id: string | null
          provider_key: string
          status: string | null
          updated_at: string | null
          welcome_message: string | null
          working_hours: Json | null
        }
        Insert: {
          auto_reply_when_offline?: string | null
          config?: Json | null
          connection_name: string
          created_at?: string | null
          credentials?: Json | null
          default_pipeline_stage_id?: string | null
          id?: string
          is_primary?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          organization_id?: string | null
          provider_id?: string | null
          provider_key: string
          status?: string | null
          updated_at?: string | null
          welcome_message?: string | null
          working_hours?: Json | null
        }
        Update: {
          auto_reply_when_offline?: string | null
          config?: Json | null
          connection_name?: string
          created_at?: string | null
          credentials?: Json | null
          default_pipeline_stage_id?: string | null
          id?: string
          is_primary?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          organization_id?: string | null
          provider_id?: string | null
          provider_key?: string
          status?: string | null
          updated_at?: string | null
          welcome_message?: string | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_default_pipeline_stage_id_fkey"
            columns: ["default_pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "integration_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "integration_connections_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "integration_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_providers: {
        Row: {
          category: string
          config_schema: Json | null
          created_at: string | null
          description: string | null
          documentation_url: string | null
          icon_url: string | null
          id: string
          is_enabled: boolean | null
          is_premium: boolean | null
          key: string
          name: string
          setup_instructions: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          config_schema?: Json | null
          created_at?: string | null
          description?: string | null
          documentation_url?: string | null
          icon_url?: string | null
          id?: string
          is_enabled?: boolean | null
          is_premium?: boolean | null
          key: string
          name: string
          setup_instructions?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          config_schema?: Json | null
          created_at?: string | null
          description?: string | null
          documentation_url?: string | null
          icon_url?: string | null
          id?: string
          is_enabled?: boolean | null
          is_premium?: boolean | null
          key?: string
          name?: string
          setup_instructions?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      intent_routing_rules: {
        Row: {
          add_tags: string[] | null
          auto_assign_to_team: string | null
          created_at: string | null
          id: string
          intent: string
          is_active: boolean | null
          min_confidence: number | null
          organization_id: string
          required_skills: string[] | null
          set_priority: string | null
          trigger_workflow_id: string | null
          updated_at: string | null
        }
        Insert: {
          add_tags?: string[] | null
          auto_assign_to_team?: string | null
          created_at?: string | null
          id?: string
          intent: string
          is_active?: boolean | null
          min_confidence?: number | null
          organization_id: string
          required_skills?: string[] | null
          set_priority?: string | null
          trigger_workflow_id?: string | null
          updated_at?: string | null
        }
        Update: {
          add_tags?: string[] | null
          auto_assign_to_team?: string | null
          created_at?: string | null
          id?: string
          intent?: string
          is_active?: boolean | null
          min_confidence?: number | null
          organization_id?: string
          required_skills?: string[] | null
          set_priority?: string | null
          trigger_workflow_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intent_routing_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "intent_routing_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_routing_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      invoices: {
        Row: {
          archived: boolean | null
          billing_cycle_id: string | null
          client_id: string
          created_at: string
          date: string
          deleted_at: string | null
          document_type: string | null
          due_date: string | null
          emitter_id: string | null
          id: string
          is_late_issued: boolean | null
          items: Json
          metadata: Json | null
          number: string
          organization_id: string
          payment_status: string | null
          pdf_url: string | null
          sent: boolean | null
          service_id: string | null
          status: string | null
          total: number
        }
        Insert: {
          archived?: boolean | null
          billing_cycle_id?: string | null
          client_id: string
          created_at?: string
          date: string
          deleted_at?: string | null
          document_type?: string | null
          due_date?: string | null
          emitter_id?: string | null
          id?: string
          is_late_issued?: boolean | null
          items?: Json
          metadata?: Json | null
          number: string
          organization_id: string
          payment_status?: string | null
          pdf_url?: string | null
          sent?: boolean | null
          service_id?: string | null
          status?: string | null
          total: number
        }
        Update: {
          archived?: boolean | null
          billing_cycle_id?: string | null
          client_id?: string
          created_at?: string
          date?: string
          deleted_at?: string | null
          document_type?: string | null
          due_date?: string | null
          emitter_id?: string | null
          id?: string
          is_late_issued?: boolean | null
          items?: Json
          metadata?: Json | null
          number?: string
          organization_id?: string
          payment_status?: string | null
          pdf_url?: string | null
          sent?: boolean | null
          service_id?: string | null
          status?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_billing_cycle_id_fkey"
            columns: ["billing_cycle_id"]
            isOneToOne: false
            referencedRelation: "billing_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_emitter_id_fkey"
            columns: ["emitter_id"]
            isOneToOne: false
            referencedRelation: "emitters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "invoices_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          assigned_to: string | null
          avatar_url: string | null
          category_id: string | null
          company_name: string | null
          contact_type: string | null
          created_at: string
          currency: string | null
          deleted_at: string | null
          email: string | null
          estimated_value: number | null
          facebook: string | null
          id: string
          instagram: string | null
          is_master_contact: boolean | null
          last_activity_at: string | null
          last_scored_at: string | null
          linkedin: string | null
          logo_url: string | null
          marketing_opted_out: boolean | null
          master_contact_id: string | null
          metadata: Json | null
          migrated_from_client_id: string | null
          name: string
          nit: string | null
          notes: string | null
          opted_out_at: string | null
          organization_id: string
          phone: string | null
          portal_config: Json | null
          portal_short_token: string | null
          portal_token: string | null
          portal_token_created_at: string | null
          portal_token_expires_at: string | null
          portal_token_never_expires: boolean | null
          priority: string | null
          quote_id: string | null
          quote_status: string | null
          score: number | null
          source: string | null
          source_connection_id: string | null
          status: string | null
          tags: string[] | null
          tiktok: string | null
          twitter: string | null
          updated_at: string | null
          user_id: string | null
          value: number | null
          website: string | null
          won_at: string | null
          youtube: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          category_id?: string | null
          company_name?: string | null
          contact_type?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          email?: string | null
          estimated_value?: number | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_master_contact?: boolean | null
          last_activity_at?: string | null
          last_scored_at?: string | null
          linkedin?: string | null
          logo_url?: string | null
          marketing_opted_out?: boolean | null
          master_contact_id?: string | null
          metadata?: Json | null
          migrated_from_client_id?: string | null
          name: string
          nit?: string | null
          notes?: string | null
          opted_out_at?: string | null
          organization_id: string
          phone?: string | null
          portal_config?: Json | null
          portal_short_token?: string | null
          portal_token?: string | null
          portal_token_created_at?: string | null
          portal_token_expires_at?: string | null
          portal_token_never_expires?: boolean | null
          priority?: string | null
          quote_id?: string | null
          quote_status?: string | null
          score?: number | null
          source?: string | null
          source_connection_id?: string | null
          status?: string | null
          tags?: string[] | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: number | null
          website?: string | null
          won_at?: string | null
          youtube?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          category_id?: string | null
          company_name?: string | null
          contact_type?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          email?: string | null
          estimated_value?: number | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_master_contact?: boolean | null
          last_activity_at?: string | null
          last_scored_at?: string | null
          linkedin?: string | null
          logo_url?: string | null
          marketing_opted_out?: boolean | null
          master_contact_id?: string | null
          metadata?: Json | null
          migrated_from_client_id?: string | null
          name?: string
          nit?: string | null
          notes?: string | null
          opted_out_at?: string | null
          organization_id?: string
          phone?: string | null
          portal_config?: Json | null
          portal_short_token?: string | null
          portal_token?: string | null
          portal_token_created_at?: string | null
          portal_token_expires_at?: string | null
          portal_token_never_expires?: boolean | null
          priority?: string | null
          quote_id?: string | null
          quote_status?: string | null
          score?: number | null
          source?: string | null
          source_connection_id?: string | null
          status?: string | null
          tags?: string[] | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: number | null
          website?: string | null
          won_at?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "client_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_master_contact_id_fkey"
            columns: ["master_contact_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_master_contact_id_fkey"
            columns: ["master_contact_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "leads_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_connection_id_fkey"
            columns: ["source_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_notifications: {
        Row: {
          email_sent_to: string | null
          id: string
          notification_type: string
          organization_id: string | null
          sent_at: string | null
        }
        Insert: {
          email_sent_to?: string | null
          id?: string
          notification_type: string
          organization_id?: string | null
          sent_at?: string | null
        }
        Update: {
          email_sent_to?: string | null
          id?: string
          notification_type?: string
          organization_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "lifecycle_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      manifest_documents: {
        Row: {
          created_at: string | null
          file_size: number | null
          filename: string
          id: string
          mime_type: string | null
          organization_id: string
          status: string | null
          storage_path: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          filename: string
          id?: string
          mime_type?: string | null
          organization_id: string
          status?: string | null
          storage_path: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          mime_type?: string | null
          organization_id?: string
          status?: string | null
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manifest_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "manifest_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      manifest_imeis: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          imei: string
          organization_id: string
          page_number: number
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          imei: string
          organization_id: string
          page_number: number
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          imei?: string
          organization_id?: string
          page_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "manifest_imeis_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "manifest_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_imeis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "manifest_imeis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_imeis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      marketing_audiences: {
        Row: {
          cached_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          filter_config: Json | null
          id: string
          last_count_at: string | null
          name: string
          organization_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          cached_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filter_config?: Json | null
          id?: string
          last_count_at?: string | null
          name: string
          organization_id: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          cached_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filter_config?: Json | null
          id?: string
          last_count_at?: string | null
          name?: string
          organization_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_audiences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "marketing_audiences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_audiences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          audience_id: string | null
          created_at: string | null
          created_by: string | null
          delivery_config: Json | null
          description: string | null
          engagement_score: number | null
          goal: string | null
          id: string
          name: string
          organization_id: string
          scheduled_for: string | null
          status: string
          tags: string[] | null
          total_completed: number | null
          total_enrolled: number | null
          updated_at: string | null
        }
        Insert: {
          audience_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_config?: Json | null
          description?: string | null
          engagement_score?: number | null
          goal?: string | null
          id?: string
          name: string
          organization_id: string
          scheduled_for?: string | null
          status?: string
          tags?: string[] | null
          total_completed?: number | null
          total_enrolled?: number | null
          updated_at?: string | null
        }
        Update: {
          audience_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_config?: Json | null
          description?: string | null
          engagement_score?: number | null
          goal?: string | null
          id?: string
          name?: string
          organization_id?: string
          scheduled_for?: string | null
          status?: string
          tags?: string[] | null
          total_completed?: number | null
          total_enrolled?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "marketing_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      marketing_enrollments: {
        Row: {
          campaign_id: string | null
          completed_at: string | null
          contact_id: string
          current_step_id: string | null
          execution_logs: Json | null
          id: string
          last_error: string | null
          last_run_at: string | null
          next_run_at: string | null
          organization_id: string
          sequence_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          campaign_id?: string | null
          completed_at?: string | null
          contact_id: string
          current_step_id?: string | null
          execution_logs?: Json | null
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          organization_id: string
          sequence_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string | null
          completed_at?: string | null
          contact_id?: string
          current_step_id?: string | null
          execution_logs?: Json | null
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          organization_id?: string
          sequence_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_enrollments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_enrollments_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "marketing_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "marketing_enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "marketing_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "marketing_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_sequences: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_sequences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "marketing_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      marketing_steps: {
        Row: {
          condition_config: Json | null
          content: Json | null
          delay_config: Json | null
          id: string
          name: string
          order_index: number
          organization_id: string
          sequence_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          condition_config?: Json | null
          content?: Json | null
          delay_config?: Json | null
          id?: string
          name: string
          order_index?: number
          organization_id: string
          sequence_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          condition_config?: Json | null
          content?: Json | null
          delay_config?: Json | null
          id?: string
          name?: string
          order_index?: number
          organization_id?: string
          sequence_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "marketing_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "marketing_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "marketing_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          reaction: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          reaction: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          reaction?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel: string
          content: Json
          conversation_id: string
          created_at: string | null
          detected_emotions: Json | null
          direction: string
          external_id: string | null
          id: string
          metadata: Json | null
          organization_id: string
          sender: string | null
          sentiment: string | null
          sentiment_score: number | null
          status: string
        }
        Insert: {
          channel: string
          content?: Json
          conversation_id: string
          created_at?: string | null
          detected_emotions?: Json | null
          direction: string
          external_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          sender?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          status?: string
        }
        Update: {
          channel?: string
          content?: Json
          conversation_id?: string
          created_at?: string | null
          detected_emotions?: Json | null
          direction?: string
          external_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          sender?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      messaging_templates: {
        Row: {
          category: string | null
          channel_id: string | null
          components: Json | null
          content: string
          created_at: string | null
          id: string
          language: string | null
          meta_id: string | null
          name: string
          organization_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          channel_id?: string | null
          components?: Json | null
          content: string
          created_at?: string | null
          id?: string
          language?: string | null
          meta_id?: string | null
          name: string
          organization_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          channel_id?: string | null
          components?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          language?: string | null
          meta_id?: string | null
          name?: string
          organization_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messaging_templates_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "messaging_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      meta_ads_metrics: {
        Row: {
          campaigns: Json | null
          clicks: number | null
          client_id: string | null
          cpc: number | null
          ctr: number | null
          id: string
          impressions: number | null
          last_updated: string | null
          roas: number | null
          snapshot_date: string | null
          spend: number | null
        }
        Insert: {
          campaigns?: Json | null
          clicks?: number | null
          client_id?: string | null
          cpc?: number | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          last_updated?: string | null
          roas?: number | null
          snapshot_date?: string | null
          spend?: number | null
        }
        Update: {
          campaigns?: Json | null
          clicks?: number | null
          client_id?: string | null
          cpc?: number | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          last_updated?: string | null
          roas?: number | null
          snapshot_date?: string | null
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_org_ads_metrics: {
        Row: {
          campaigns: Json | null
          clicks: number | null
          cpc: number | null
          created_at: string | null
          ctr: number | null
          id: string
          impressions: number | null
          metadata: Json | null
          organization_id: string
          roas: number | null
          snapshot_date: string
          spend: number | null
          updated_at: string | null
        }
        Insert: {
          campaigns?: Json | null
          clicks?: number | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          metadata?: Json | null
          organization_id: string
          roas?: number | null
          snapshot_date?: string
          spend?: number | null
          updated_at?: string | null
        }
        Update: {
          campaigns?: Json | null
          clicks?: number | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          metadata?: Json | null
          organization_id?: string
          roas?: number | null
          snapshot_date?: string
          spend?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_org_ads_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "meta_org_ads_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_org_ads_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      meta_social_metrics: {
        Row: {
          client_id: string | null
          created_at: string | null
          engagement: number | null
          facebook_data: Json | null
          followers: number | null
          id: string
          impressions: number | null
          instagram_data: Json | null
          last_updated: string | null
          reach: number | null
          snapshot_date: string | null
          top_posts: Json | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          engagement?: number | null
          facebook_data?: Json | null
          followers?: number | null
          id?: string
          impressions?: number | null
          instagram_data?: Json | null
          last_updated?: string | null
          reach?: number | null
          snapshot_date?: string | null
          top_posts?: Json | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          engagement?: number | null
          facebook_data?: Json | null
          followers?: number | null
          id?: string
          impressions?: number | null
          instagram_data?: Json | null
          last_updated?: string | null
          reach?: number | null
          snapshot_date?: string | null
          top_posts?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_social_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          client_id: string | null
          created_at: string | null
          id: string
          message: string
          organization_id: string | null
          read: boolean | null
          subscription_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          organization_id?: string | null
          read?: boolean | null
          subscription_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          organization_id?: string | null
          read?: boolean | null
          subscription_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "notifications_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_add_ons: {
        Row: {
          activated_at: string | null
          add_on_type: string
          cancelled_at: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          next_billing_date: string | null
          organization_id: string | null
          price_monthly: number
          status: string | null
          tier_id: string | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          add_on_type: string
          cancelled_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          next_billing_date?: string | null
          organization_id?: string | null
          price_monthly?: number
          status?: string | null
          tier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          add_on_type?: string
          cancelled_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          next_billing_date?: string | null
          organization_id?: string | null
          price_monthly?: number
          status?: string | null
          tier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_add_ons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_add_ons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_add_ons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          organization_id: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          organization_id?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          organization_id?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_audit_log_performed_by_profiles_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_billing_profiles: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          legal_name: string | null
          organization_id: string
          phone: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          legal_name?: string | null
          organization_id: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          legal_name?: string | null
          organization_id?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_billing_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_billing_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_billing_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_locations: {
        Row: {
          address: string | null
          business_hours: Json | null
          city: string | null
          country: string | null
          created_at: string
          geofence_radius_meters: number | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          manager_id: string | null
          name: string
          organization_id: string
          state: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_hours?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string
          geofence_radius_meters?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          name: string
          organization_id: string
          state?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_hours?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string
          geofence_radius_meters?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          name?: string
          organization_id?: string
          state?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          organization_id: string
          permissions: Json | null
          role: string
          role_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          organization_id: string
          permissions?: Json | null
          role?: string
          role_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          organization_id?: string
          permissions?: Json | null
          role?: string
          role_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_modules: {
        Row: {
          assigned_at: string | null
          id: string
          module_key: string
          organization_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          module_key: string
          organization_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          module_key?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_payment_methods: {
        Row: {
          created_at: string
          details: Json
          display_order: number | null
          id: string
          instructions: string | null
          is_active: boolean | null
          organization_id: string
          title: string
          type: Database["public"]["Enums"]["payment_method_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: Json
          display_order?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          organization_id: string
          title: string
          type?: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: Json
          display_order?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          organization_id?: string
          title?: string
          type?: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
        }
        Relationships: []
      }
      organization_roles: {
        Row: {
          created_at: string | null
          description: string | null
          hierarchy_level: number | null
          id: string
          is_system_role: boolean | null
          name: string
          organization_id: string
          permissions: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hierarchy_level?: number | null
          id?: string
          is_system_role?: boolean | null
          name: string
          organization_id: string
          permissions?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hierarchy_level?: number | null
          id?: string
          is_system_role?: boolean | null
          name?: string
          organization_id?: string
          permissions?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_saas_products: {
        Row: {
          activated_at: string | null
          created_at: string
          organization_id: string
          product_id: string
          status: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          organization_id: string
          product_id: string
          status?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          organization_id?: string
          product_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_saas_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_saas_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_saas_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_saas_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "saas_products"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_sequences: {
        Row: {
          entity_type: string
          id: string
          last_number: number | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          entity_type: string
          id?: string
          last_number?: number | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          entity_type?: string
          id?: string
          last_number?: number | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          agency_country: string | null
          agency_currency: string | null
          agency_email: string | null
          agency_legal_name: string | null
          agency_logo_url: string | null
          agency_name: string
          agency_phone: string | null
          agency_timezone: string | null
          agency_website: string | null
          brand_font_family: string | null
          comm_assisted_mode: boolean | null
          comm_sender_name: string | null
          comm_templates: Json | null
          comm_whatsapp_number: string | null
          comm_whatsapp_prefix: string | null
          created_at: string
          currency_format: string | null
          custom_domain: string | null
          custom_domain_status: string | null
          date_format: string | null
          default_language: string | null
          document_font_family: string | null
          document_footer_text_color: string | null
          document_header_text_color: string | null
          document_logo_size: string | null
          document_logo_url: string | null
          document_primary_color: string | null
          document_secondary_color: string | null
          document_show_watermark: boolean | null
          document_template_style: string | null
          document_watermark_text: string | null
          email_footer_text: string | null
          email_style: string | null
          id: string
          invoice_footer: string | null
          isotipo_url: string | null
          legal_text: string | null
          main_logo_light_url: string | null
          main_logo_url: string | null
          organization_id: string
          portal_enabled: boolean | null
          portal_favicon_url: string | null
          portal_footer_text: string | null
          portal_language: string | null
          portal_login_background_color: string | null
          portal_login_background_url: string | null
          portal_logo_url: string | null
          portal_modules: Json | null
          portal_primary_color: string | null
          portal_secondary_color: string | null
          portal_show_agency_name: boolean | null
          portal_show_contact_info: boolean | null
          portal_subdomain: string | null
          portal_welcome_message: string | null
          show_all_portal_modules: boolean | null
          show_powered_by_footer: boolean | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_twitter: string | null
          social_youtube: string | null
          trash_shortcut: string | null
          updated_at: string
          wompi_currency: string | null
          wompi_integrity_secret: string | null
          wompi_public_key: string | null
        }
        Insert: {
          agency_country?: string | null
          agency_currency?: string | null
          agency_email?: string | null
          agency_legal_name?: string | null
          agency_logo_url?: string | null
          agency_name?: string
          agency_phone?: string | null
          agency_timezone?: string | null
          agency_website?: string | null
          brand_font_family?: string | null
          comm_assisted_mode?: boolean | null
          comm_sender_name?: string | null
          comm_templates?: Json | null
          comm_whatsapp_number?: string | null
          comm_whatsapp_prefix?: string | null
          created_at?: string
          currency_format?: string | null
          custom_domain?: string | null
          custom_domain_status?: string | null
          date_format?: string | null
          default_language?: string | null
          document_font_family?: string | null
          document_footer_text_color?: string | null
          document_header_text_color?: string | null
          document_logo_size?: string | null
          document_logo_url?: string | null
          document_primary_color?: string | null
          document_secondary_color?: string | null
          document_show_watermark?: boolean | null
          document_template_style?: string | null
          document_watermark_text?: string | null
          email_footer_text?: string | null
          email_style?: string | null
          id?: string
          invoice_footer?: string | null
          isotipo_url?: string | null
          legal_text?: string | null
          main_logo_light_url?: string | null
          main_logo_url?: string | null
          organization_id: string
          portal_enabled?: boolean | null
          portal_favicon_url?: string | null
          portal_footer_text?: string | null
          portal_language?: string | null
          portal_login_background_color?: string | null
          portal_login_background_url?: string | null
          portal_logo_url?: string | null
          portal_modules?: Json | null
          portal_primary_color?: string | null
          portal_secondary_color?: string | null
          portal_show_agency_name?: boolean | null
          portal_show_contact_info?: boolean | null
          portal_subdomain?: string | null
          portal_welcome_message?: string | null
          show_all_portal_modules?: boolean | null
          show_powered_by_footer?: boolean | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          trash_shortcut?: string | null
          updated_at?: string
          wompi_currency?: string | null
          wompi_integrity_secret?: string | null
          wompi_public_key?: string | null
        }
        Update: {
          agency_country?: string | null
          agency_currency?: string | null
          agency_email?: string | null
          agency_legal_name?: string | null
          agency_logo_url?: string | null
          agency_name?: string
          agency_phone?: string | null
          agency_timezone?: string | null
          agency_website?: string | null
          brand_font_family?: string | null
          comm_assisted_mode?: boolean | null
          comm_sender_name?: string | null
          comm_templates?: Json | null
          comm_whatsapp_number?: string | null
          comm_whatsapp_prefix?: string | null
          created_at?: string
          currency_format?: string | null
          custom_domain?: string | null
          custom_domain_status?: string | null
          date_format?: string | null
          default_language?: string | null
          document_font_family?: string | null
          document_footer_text_color?: string | null
          document_header_text_color?: string | null
          document_logo_size?: string | null
          document_logo_url?: string | null
          document_primary_color?: string | null
          document_secondary_color?: string | null
          document_show_watermark?: boolean | null
          document_template_style?: string | null
          document_watermark_text?: string | null
          email_footer_text?: string | null
          email_style?: string | null
          id?: string
          invoice_footer?: string | null
          isotipo_url?: string | null
          legal_text?: string | null
          main_logo_light_url?: string | null
          main_logo_url?: string | null
          organization_id?: string
          portal_enabled?: boolean | null
          portal_favicon_url?: string | null
          portal_footer_text?: string | null
          portal_language?: string | null
          portal_login_background_color?: string | null
          portal_login_background_url?: string | null
          portal_logo_url?: string | null
          portal_modules?: Json | null
          portal_primary_color?: string | null
          portal_secondary_color?: string | null
          portal_show_agency_name?: boolean | null
          portal_show_contact_info?: boolean | null
          portal_subdomain?: string | null
          portal_welcome_message?: string | null
          show_all_portal_modules?: boolean | null
          show_powered_by_footer?: boolean | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          trash_shortcut?: string | null
          updated_at?: string
          wompi_currency?: string | null
          wompi_integrity_secret?: string | null
          wompi_public_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_smtp_configs: {
        Row: {
          created_at: string | null
          from_email: string
          from_name: string
          host: string
          id: string
          is_verified: boolean | null
          iv: string
          last_verified_at: string | null
          organization_id: string
          password_encrypted: string
          port: number
          provider: Database["public"]["Enums"]["smtp_provider_type"] | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          created_at?: string | null
          from_email: string
          from_name: string
          host: string
          id?: string
          is_verified?: boolean | null
          iv: string
          last_verified_at?: string | null
          organization_id: string
          password_encrypted: string
          port: number
          provider?: Database["public"]["Enums"]["smtp_provider_type"] | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          created_at?: string | null
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_verified?: boolean | null
          iv?: string
          last_verified_at?: string | null
          organization_id?: string
          password_encrypted?: string
          port?: number
          provider?: Database["public"]["Enums"]["smtp_provider_type"] | null
          updated_at?: string | null
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_smtp_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_smtp_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_smtp_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_staff: {
        Row: {
          access_token: string | null
          break_duration_minutes: number | null
          created_at: string
          document_id: string | null
          email: string | null
          expected_hours_per_day: number | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          location_id: string | null
          organization_id: string
          phone: string | null
          photo_url: string | null
          pin_code: string | null
          role: string | null
          shift_type: string | null
          updated_at: string
          user_id: string | null
          work_schedule: Json | null
        }
        Insert: {
          access_token?: string | null
          break_duration_minutes?: number | null
          created_at?: string
          document_id?: string | null
          email?: string | null
          expected_hours_per_day?: number | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          location_id?: string | null
          organization_id: string
          phone?: string | null
          photo_url?: string | null
          pin_code?: string | null
          role?: string | null
          shift_type?: string | null
          updated_at?: string
          user_id?: string | null
          work_schedule?: Json | null
        }
        Update: {
          access_token?: string | null
          break_duration_minutes?: number | null
          created_at?: string
          document_id?: string | null
          email?: string | null
          expected_hours_per_day?: number | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          location_id?: string | null
          organization_id?: string
          phone?: string | null
          photo_url?: string | null
          pin_code?: string | null
          role?: string | null
          shift_type?: string | null
          updated_at?: string
          user_id?: string | null
          work_schedule?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_staff_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "organization_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organizations: {
        Row: {
          acquired_by_reseller_id: string | null
          acquisition_date: string | null
          active_app_id: string | null
          activity_score: number | null
          allow_direct_billing: boolean | null
          app_activated_at: string | null
          app_metadata: Json | null
          base_app_slug: string | null
          branding_custom_config: Json | null
          branding_tier_activated_at: string | null
          branding_tier_id: string | null
          capabilities: Json | null
          created_at: string
          custom_admin_domain: string | null
          custom_portal_domain: string | null
          deleted_at: string | null
          deletion_scheduled_at: string | null
          deletion_warning_sent_at: string | null
          dormant_at: string | null
          id: string
          last_activity_at: string | null
          logo_url: string | null
          manual_module_overrides: Json | null
          name: string
          next_billing_date: string | null
          organization_type: string | null
          owner_id: string | null
          parent_organization_id: string | null
          payment_status: string | null
          rate_limit_config: Json | null
          slug: string
          status: string | null
          status_reason: string | null
          subscription_product_id: string | null
          subscription_status: string | null
          suspended_at: string | null
          suspended_reason: string | null
          trial_ends_at: string | null
          updated_at: string | null
          use_custom_domains: boolean | null
          vault_config: Json | null
          vertical_key: string | null
        }
        Insert: {
          acquired_by_reseller_id?: string | null
          acquisition_date?: string | null
          active_app_id?: string | null
          activity_score?: number | null
          allow_direct_billing?: boolean | null
          app_activated_at?: string | null
          app_metadata?: Json | null
          base_app_slug?: string | null
          branding_custom_config?: Json | null
          branding_tier_activated_at?: string | null
          branding_tier_id?: string | null
          capabilities?: Json | null
          created_at?: string
          custom_admin_domain?: string | null
          custom_portal_domain?: string | null
          deleted_at?: string | null
          deletion_scheduled_at?: string | null
          deletion_warning_sent_at?: string | null
          dormant_at?: string | null
          id?: string
          last_activity_at?: string | null
          logo_url?: string | null
          manual_module_overrides?: Json | null
          name: string
          next_billing_date?: string | null
          organization_type?: string | null
          owner_id?: string | null
          parent_organization_id?: string | null
          payment_status?: string | null
          rate_limit_config?: Json | null
          slug: string
          status?: string | null
          status_reason?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          use_custom_domains?: boolean | null
          vault_config?: Json | null
          vertical_key?: string | null
        }
        Update: {
          acquired_by_reseller_id?: string | null
          acquisition_date?: string | null
          active_app_id?: string | null
          activity_score?: number | null
          allow_direct_billing?: boolean | null
          app_activated_at?: string | null
          app_metadata?: Json | null
          base_app_slug?: string | null
          branding_custom_config?: Json | null
          branding_tier_activated_at?: string | null
          branding_tier_id?: string | null
          capabilities?: Json | null
          created_at?: string
          custom_admin_domain?: string | null
          custom_portal_domain?: string | null
          deleted_at?: string | null
          deletion_scheduled_at?: string | null
          deletion_warning_sent_at?: string | null
          dormant_at?: string | null
          id?: string
          last_activity_at?: string | null
          logo_url?: string | null
          manual_module_overrides?: Json | null
          name?: string
          next_billing_date?: string | null
          organization_type?: string | null
          owner_id?: string | null
          parent_organization_id?: string | null
          payment_status?: string | null
          rate_limit_config?: Json | null
          slug?: string
          status?: string | null
          status_reason?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          use_custom_domains?: boolean | null
          vault_config?: Json | null
          vertical_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_acquired_by_reseller_id_fkey"
            columns: ["acquired_by_reseller_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organizations_acquired_by_reseller_id_fkey"
            columns: ["acquired_by_reseller_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_acquired_by_reseller_id_fkey"
            columns: ["acquired_by_reseller_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organizations_active_app_id_fkey"
            columns: ["active_app_id"]
            isOneToOne: false
            referencedRelation: "saas_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_active_app_id_fkey"
            columns: ["active_app_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "organizations_active_app_id_fkey"
            columns: ["active_app_id"]
            isOneToOne: false
            referencedRelation: "v_template_modules"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "organizations_branding_tier_id_fkey"
            columns: ["branding_tier_id"]
            isOneToOne: false
            referencedRelation: "branding_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organizations_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organizations_subscription_product_id_fkey"
            columns: ["subscription_product_id"]
            isOneToOne: false
            referencedRelation: "saas_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_vertical_key_fkey"
            columns: ["vertical_key"]
            isOneToOne: false
            referencedRelation: "verticals"
            referencedColumns: ["key"]
          },
        ]
      }
      passkey_challenges: {
        Row: {
          challenge: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_accounts: {
        Row: {
          charges_enabled: boolean | null
          country: string | null
          created_at: string | null
          default_currency: string | null
          id: string
          metadata: Json | null
          minimum_payout_amount: number | null
          onboarding_complete: boolean | null
          organization_id: string | null
          payout_schedule: string | null
          payouts_enabled: boolean | null
          provider: string | null
          stripe_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          charges_enabled?: boolean | null
          country?: string | null
          created_at?: string | null
          default_currency?: string | null
          id?: string
          metadata?: Json | null
          minimum_payout_amount?: number | null
          onboarding_complete?: boolean | null
          organization_id?: string | null
          payout_schedule?: string | null
          payouts_enabled?: boolean | null
          provider?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          charges_enabled?: boolean | null
          country?: string | null
          created_at?: string | null
          default_currency?: string | null
          id?: string
          metadata?: Json | null
          minimum_payout_amount?: number | null
          onboarding_complete?: boolean | null
          organization_id?: string | null
          payout_schedule?: string | null
          payouts_enabled?: boolean | null
          provider?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payment_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      payment_config_audit: {
        Row: {
          action: string
          changed_by: string | null
          changes: Json | null
          created_at: string | null
          gateway_name: string
          id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          changes?: Json | null
          created_at?: string | null
          gateway_name: string
          id?: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          changes?: Json | null
          created_at?: string | null
          gateway_name?: string
          id?: string
        }
        Relationships: []
      }
      payment_gateway_config: {
        Row: {
          config: Json | null
          created_at: string | null
          display_name: string
          gateway_name: string
          id: string
          is_enabled: boolean | null
          is_live_mode: boolean | null
          last_tested_at: string | null
          platform_fee_fixed_cents: number | null
          platform_fee_percent: number | null
          public_key: string | null
          secret_key_ref: string | null
          supports_connect: boolean | null
          supports_invoicing: boolean | null
          supports_subscriptions: boolean | null
          test_result: string | null
          updated_at: string | null
          webhook_secret_ref: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          display_name: string
          gateway_name: string
          id?: string
          is_enabled?: boolean | null
          is_live_mode?: boolean | null
          last_tested_at?: string | null
          platform_fee_fixed_cents?: number | null
          platform_fee_percent?: number | null
          public_key?: string | null
          secret_key_ref?: string | null
          supports_connect?: boolean | null
          supports_invoicing?: boolean | null
          supports_subscriptions?: boolean | null
          test_result?: string | null
          updated_at?: string | null
          webhook_secret_ref?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          display_name?: string
          gateway_name?: string
          id?: string
          is_enabled?: boolean | null
          is_live_mode?: boolean | null
          last_tested_at?: string | null
          platform_fee_fixed_cents?: number | null
          platform_fee_percent?: number | null
          public_key?: string | null
          secret_key_ref?: string | null
          supports_connect?: boolean | null
          supports_invoicing?: boolean | null
          supports_subscriptions?: boolean | null
          test_result?: string | null
          updated_at?: string | null
          webhook_secret_ref?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_in_cents: number
          created_at: string | null
          currency: string
          id: string
          invoice_ids: Json
          metadata: Json | null
          organization_id: string | null
          reference: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount_in_cents: number
          created_at?: string | null
          currency: string
          id?: string
          invoice_ids: Json
          metadata?: Json | null
          organization_id?: string | null
          reference: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_in_cents?: number
          created_at?: string | null
          currency?: string
          id?: string
          invoice_ids?: Json
          metadata?: Json | null
          organization_id?: string | null
          reference?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payment_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      pipeline_process_map: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          pipeline_stage_id: string
          process_state_key: string
          process_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          pipeline_stage_id: string
          process_state_key: string
          process_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          pipeline_stage_id?: string
          process_state_key?: string
          process_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_process_map_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pipeline_process_map_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_process_map_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pipeline_process_map_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean | null
          is_final: boolean | null
          name: string
          organization_id: string
          pipeline_id: string | null
          status_key: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_final?: boolean | null
          name: string
          organization_id: string
          pipeline_id?: string | null
          status_key: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_final?: boolean | null
          name?: string
          organization_id?: string
          pipeline_id?: string | null
          status_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pipeline_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          process_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          process_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          process_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pipelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      plan_limit_definitions: {
        Row: {
          description: string | null
          engine: string
          id: string
          limit_value: number
          period: string
          plan_id: string | null
        }
        Insert: {
          description?: string | null
          engine: string
          id?: string
          limit_value: number
          period: string
          plan_id?: string | null
        }
        Update: {
          description?: string | null
          engine?: string
          id?: string
          limit_value?: number
          period?: string
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_limit_definitions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_templates: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          plan_code: string
          plan_name: string
          price_monthly: number
          price_yearly: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          plan_code: string
          plan_name: string
          price_monthly: number
          price_yearly: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          plan_code?: string
          plan_name?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          admin_domain: string | null
          agency_name: string
          brand_color_primary: string | null
          brand_color_secondary: string | null
          created_at: string
          domain_updated_at: string | null
          email_style: string | null
          favicon_url: string | null
          id: number
          login_background_url: string | null
          main_logo_light_url: string | null
          main_logo_url: string | null
          portal_domain: string | null
          portal_logo_url: string | null
          social_links: Json | null
          updated_at: string
        }
        Insert: {
          admin_domain?: string | null
          agency_name?: string
          brand_color_primary?: string | null
          brand_color_secondary?: string | null
          created_at?: string
          domain_updated_at?: string | null
          email_style?: string | null
          favicon_url?: string | null
          id?: number
          login_background_url?: string | null
          main_logo_light_url?: string | null
          main_logo_url?: string | null
          portal_domain?: string | null
          portal_logo_url?: string | null
          social_links?: Json | null
          updated_at?: string
        }
        Update: {
          admin_domain?: string | null
          agency_name?: string
          brand_color_primary?: string | null
          brand_color_secondary?: string | null
          created_at?: string
          domain_updated_at?: string | null
          email_style?: string | null
          favicon_url?: string | null
          id?: number
          login_background_url?: string | null
          main_logo_light_url?: string | null
          main_logo_url?: string | null
          portal_domain?: string | null
          portal_logo_url?: string | null
          social_links?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      portal_access_logs: {
        Row: {
          access_type: string | null
          client_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string | null
          token_used: string
          user_agent: string | null
        }
        Insert: {
          access_type?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          token_used: string
          user_agent?: string | null
        }
        Update: {
          access_type?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          token_used?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_access_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_access_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "portal_access_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_access_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      process_instances: {
        Row: {
          context: Json | null
          created_at: string | null
          current_state: string
          history: Json[] | null
          id: string
          lead_id: string
          locked: boolean | null
          organization_id: string
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          current_state: string
          history?: Json[] | null
          id?: string
          lead_id: string
          locked?: boolean | null
          organization_id: string
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          current_state?: string
          history?: Json[] | null
          id?: string
          lead_id?: string
          locked?: boolean | null
          organization_id?: string
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_instances_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_instances_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "process_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      process_states: {
        Row: {
          allowed_next_states: string[] | null
          created_at: string | null
          description: string | null
          id: string
          is_initial: boolean | null
          is_terminal: boolean | null
          key: string
          metadata: Json | null
          name: string
          organization_id: string
          suggested_actions: Json | null
          type: string
          updated_at: string | null
        }
        Insert: {
          allowed_next_states?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_initial?: boolean | null
          is_terminal?: boolean | null
          key: string
          metadata?: Json | null
          name: string
          organization_id: string
          suggested_actions?: Json | null
          type: string
          updated_at?: string | null
        }
        Update: {
          allowed_next_states?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_initial?: boolean | null
          is_terminal?: boolean | null
          key?: string
          metadata?: Json | null
          name?: string
          organization_id?: string
          suggested_actions?: Json | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "process_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          job_title: string | null
          language_preference: string | null
          phone: string | null
          platform_role: string | null
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          language_preference?: string | null
          phone?: string | null
          platform_role?: string | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          language_preference?: string | null
          phone?: string | null
          platform_role?: string | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          organization_id: string
          shortcut: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          shortcut?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          shortcut?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quick_replies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_replies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      quote_settings: {
        Row: {
          actions_config: Json | null
          approve_label: string | null
          created_at: string | null
          mostrador_config: Json | null
          organization_id: string
          reject_label: string | null
          template_config: Json | null
          updated_at: string | null
          vertical: string | null
        }
        Insert: {
          actions_config?: Json | null
          approve_label?: string | null
          created_at?: string | null
          mostrador_config?: Json | null
          organization_id: string
          reject_label?: string | null
          template_config?: Json | null
          updated_at?: string | null
          vertical?: string | null
        }
        Update: {
          actions_config?: Json | null
          approve_label?: string | null
          created_at?: string | null
          mostrador_config?: Json | null
          organization_id?: string
          reject_label?: string | null
          template_config?: Json | null
          updated_at?: string | null
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quote_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string | null
          created_at: string
          date: string
          deleted_at: string | null
          emitter_id: string | null
          id: string
          items: Json
          lead_id: string | null
          number: string
          organization_id: string
          pdf_url: string | null
          service_id: string | null
          status: string | null
          total: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          emitter_id?: string | null
          id?: string
          items?: Json
          lead_id?: string | null
          number: string
          organization_id: string
          pdf_url?: string | null
          service_id?: string | null
          status?: string | null
          total: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          emitter_id?: string | null
          id?: string
          items?: Json
          lead_id?: string | null
          number?: string
          organization_id?: string
          pdf_url?: string | null
          service_id?: string | null
          status?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_emitter_id_fkey"
            columns: ["emitter_id"]
            isOneToOne: false
            referencedRelation: "emitters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quotes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_activity_log: {
        Row: {
          activity_date: string
          activity_type: string
          client_org_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          evidence_url: string | null
          id: string
          metadata: Json | null
          reseller_org_id: string
        }
        Insert: {
          activity_date?: string
          activity_type: string
          client_org_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          evidence_url?: string | null
          id?: string
          metadata?: Json | null
          reseller_org_id: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          client_org_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          evidence_url?: string | null
          id?: string
          metadata?: Json | null
          reseller_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_activity_log_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "reseller_activity_log_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_activity_log_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "reseller_activity_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_activity_log_reseller_org_id_fkey"
            columns: ["reseller_org_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "reseller_activity_log_reseller_org_id_fkey"
            columns: ["reseller_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_activity_log_reseller_org_id_fkey"
            columns: ["reseller_org_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      resto_table_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          guest_count: number | null
          id: string
          opened_at: string
          opened_by: string | null
          organization_id: string
          status: Database["public"]["Enums"]["resto_session_status"] | null
          table_id: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          guest_count?: number | null
          id?: string
          opened_at?: string
          opened_by?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["resto_session_status"] | null
          table_id: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          guest_count?: number | null
          id?: string
          opened_at?: string
          opened_by?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["resto_session_status"] | null
          table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resto_table_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "organization_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resto_table_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "organization_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resto_table_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "resto_table_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resto_table_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "resto_table_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "resto_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      resto_tables: {
        Row: {
          capacity: number | null
          created_at: string
          current_session_id: string | null
          height: number
          id: string
          is_active: boolean | null
          organization_id: string
          pos_x: number
          pos_y: number
          qr_token: string | null
          rotation: number
          shape: Database["public"]["Enums"]["resto_table_shape"] | null
          status: Database["public"]["Enums"]["resto_table_status"] | null
          table_identifier: string
          updated_at: string
          width: number
          zone_id: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          current_session_id?: string | null
          height?: number
          id?: string
          is_active?: boolean | null
          organization_id: string
          pos_x?: number
          pos_y?: number
          qr_token?: string | null
          rotation?: number
          shape?: Database["public"]["Enums"]["resto_table_shape"] | null
          status?: Database["public"]["Enums"]["resto_table_status"] | null
          table_identifier: string
          updated_at?: string
          width?: number
          zone_id: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          current_session_id?: string | null
          height?: number
          id?: string
          is_active?: boolean | null
          organization_id?: string
          pos_x?: number
          pos_y?: number
          qr_token?: string | null
          rotation?: number
          shape?: Database["public"]["Enums"]["resto_table_shape"] | null
          status?: Database["public"]["Enums"]["resto_table_status"] | null
          table_identifier?: string
          updated_at?: string
          width?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_current_session"
            columns: ["current_session_id"]
            isOneToOne: false
            referencedRelation: "resto_table_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resto_tables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "resto_tables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resto_tables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "resto_tables_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "resto_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      resto_zones: {
        Row: {
          background_style: string | null
          created_at: string
          grid_height: number | null
          grid_width: number | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string
          visual_elements: Json | null
        }
        Insert: {
          background_style?: string | null
          created_at?: string
          grid_height?: number | null
          grid_width?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string
          visual_elements?: Json | null
        }
        Update: {
          background_style?: string | null
          created_at?: string
          grid_height?: number | null
          grid_width?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string
          visual_elements?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "resto_zones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "resto_zones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resto_zones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      revenue_share_rules: {
        Row: {
          activity_window_days: number | null
          commission_percent: number
          created_at: string | null
          created_by: string | null
          effective_from: string
          effective_to: string | null
          eligible_event_types: string[]
          id: string
          phase_end_month: number | null
          phase_name: string
          phase_start_month: number
          requires_reseller_activity: boolean | null
          reseller_org_id: string | null
          updated_at: string | null
        }
        Insert: {
          activity_window_days?: number | null
          commission_percent: number
          created_at?: string | null
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          eligible_event_types: string[]
          id?: string
          phase_end_month?: number | null
          phase_name: string
          phase_start_month: number
          requires_reseller_activity?: boolean | null
          reseller_org_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_window_days?: number | null
          commission_percent?: number
          created_at?: string | null
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          eligible_event_types?: string[]
          id?: string
          phase_end_month?: number | null
          phase_name?: string
          phase_start_month?: number
          requires_reseller_activity?: boolean | null
          reseller_org_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_share_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_share_rules_reseller_org_id_fkey"
            columns: ["reseller_org_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "revenue_share_rules_reseller_org_id_fkey"
            columns: ["reseller_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_share_rules_reseller_org_id_fkey"
            columns: ["reseller_org_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      saas_app_add_ons: {
        Row: {
          add_on_type: string
          app_id: string | null
          created_at: string | null
          discount_percent: number | null
          display_order: number | null
          id: string
          is_recommended: boolean | null
          is_required: boolean | null
          tier_id: string | null
        }
        Insert: {
          add_on_type: string
          app_id?: string | null
          created_at?: string | null
          discount_percent?: number | null
          display_order?: number | null
          id?: string
          is_recommended?: boolean | null
          is_required?: boolean | null
          tier_id?: string | null
        }
        Update: {
          add_on_type?: string
          app_id?: string | null
          created_at?: string | null
          discount_percent?: number | null
          display_order?: number | null
          id?: string
          is_recommended?: boolean | null
          is_required?: boolean | null
          tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_app_add_ons_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "saas_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_app_add_ons_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "saas_app_add_ons_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "v_template_modules"
            referencedColumns: ["template_id"]
          },
        ]
      }
      saas_app_modules: {
        Row: {
          app_id: string | null
          auto_enable: boolean | null
          created_at: string | null
          id: string
          is_core: boolean | null
          is_optional: boolean | null
          module_key: string
          sort_order: number | null
        }
        Insert: {
          app_id?: string | null
          auto_enable?: boolean | null
          created_at?: string | null
          id?: string
          is_core?: boolean | null
          is_optional?: boolean | null
          module_key: string
          sort_order?: number | null
        }
        Update: {
          app_id?: string | null
          auto_enable?: boolean | null
          created_at?: string | null
          id?: string
          is_core?: boolean | null
          is_optional?: boolean | null
          module_key?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_app_modules_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "saas_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_app_modules_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "saas_app_modules_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "v_template_modules"
            referencedColumns: ["template_id"]
          },
        ]
      }
      saas_apps: {
        Row: {
          banner_image_url: string | null
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          display_name_plural: string | null
          display_name_singular: string | null
          features: Json | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          long_description: string | null
          metadata: Json | null
          name: string
          portal_template: string
          price_monthly: number | null
          pricing_plans: Json | null
          recommended_for_verticals: string[] | null
          slug: string
          sort_order: number | null
          space_category: string | null
          trial_days: number | null
          updated_at: string | null
          vertical_compatibility: string[] | null
        }
        Insert: {
          banner_image_url?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_name_plural?: string | null
          display_name_singular?: string | null
          features?: Json | null
          icon?: string | null
          id: string
          is_active?: boolean | null
          is_featured?: boolean | null
          long_description?: string | null
          metadata?: Json | null
          name: string
          portal_template?: string
          price_monthly?: number | null
          pricing_plans?: Json | null
          recommended_for_verticals?: string[] | null
          slug: string
          sort_order?: number | null
          space_category?: string | null
          trial_days?: number | null
          updated_at?: string | null
          vertical_compatibility?: string[] | null
        }
        Update: {
          banner_image_url?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_name_plural?: string | null
          display_name_singular?: string | null
          features?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          long_description?: string | null
          metadata?: Json | null
          name?: string
          portal_template?: string
          price_monthly?: number | null
          pricing_plans?: Json | null
          recommended_for_verticals?: string[] | null
          slug?: string
          sort_order?: number | null
          space_category?: string | null
          trial_days?: number | null
          updated_at?: string | null
          vertical_compatibility?: string[] | null
        }
        Relationships: []
      }
      saas_apps_portal_config: {
        Row: {
          app_id: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_enabled: boolean | null
          module_slug: string
          portal_component_key: string
          portal_icon_key: string | null
          portal_tab_label: string
          target_portal: string | null
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_enabled?: boolean | null
          module_slug: string
          portal_component_key: string
          portal_icon_key?: string | null
          portal_tab_label: string
          target_portal?: string | null
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_enabled?: boolean | null
          module_slug?: string
          portal_component_key?: string
          portal_icon_key?: string | null
          portal_tab_label?: string
          target_portal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_apps_portal_config_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "saas_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_apps_portal_config_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "saas_apps_portal_config_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "v_template_modules"
            referencedColumns: ["template_id"]
          },
        ]
      }
      saas_platform_invoices: {
        Row: {
          amount_subtotal: number | null
          amount_total: number
          billing_period_end: string
          billing_period_start: string
          client_address: string | null
          client_legal_name: string | null
          client_tax_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          include_tax: boolean | null
          invoice_number: string
          issuer_activity: string
          issuer_location: string
          issuer_name: string
          issuer_nit: string
          notes: string | null
          organization_id: string
          payment_transaction_id: string | null
          recipient_email: string | null
          sequential_number: number
          status: string | null
          tax_amount: number | null
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          amount_subtotal?: number | null
          amount_total: number
          billing_period_end: string
          billing_period_start: string
          client_address?: string | null
          client_legal_name?: string | null
          client_tax_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          include_tax?: boolean | null
          invoice_number: string
          issuer_activity?: string
          issuer_location?: string
          issuer_name?: string
          issuer_nit?: string
          notes?: string | null
          organization_id: string
          payment_transaction_id?: string | null
          recipient_email?: string | null
          sequential_number: number
          status?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_subtotal?: number | null
          amount_total?: number
          billing_period_end?: string
          billing_period_start?: string
          client_address?: string | null
          client_legal_name?: string | null
          client_tax_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          include_tax?: boolean | null
          invoice_number?: string
          issuer_activity?: string
          issuer_location?: string
          issuer_name?: string
          issuer_nit?: string
          notes?: string | null
          organization_id?: string
          payment_transaction_id?: string | null
          recipient_email?: string | null
          sequential_number?: number
          status?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_platform_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "saas_platform_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_platform_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "saas_platform_invoices_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_product_modules: {
        Row: {
          created_at: string
          is_default_enabled: boolean | null
          module_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          is_default_enabled?: boolean | null
          module_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          is_default_enabled?: boolean | null
          module_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_product_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_product_modules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "saas_products"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_product_packages: {
        Row: {
          created_at: string
          package_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          package_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          package_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_product_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "billing_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_product_packages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "saas_products"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_products: {
        Row: {
          base_price: number | null
          created_at: string
          description: string | null
          id: string
          name: string
          pricing_model: string
          slug: string
          status: string
        }
        Insert: {
          base_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          pricing_model: string
          slug: string
          status?: string
        }
        Update: {
          base_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          pricing_model?: string
          slug?: string
          status?: string
        }
        Relationships: []
      }
      saas_subscriptions: {
        Row: {
          admin_notes: string | null
          billing_cycle: string | null
          billing_method: string | null
          bypass_until: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string
          custom_price: number | null
          id: string
          last_payment_at: string | null
          last_payment_error: Json | null
          metadata: Json | null
          organization_id: string
          payment_gateway: string
          payment_method_id: string | null
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          billing_cycle?: string | null
          billing_method?: string | null
          bypass_until?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          custom_price?: number | null
          id?: string
          last_payment_at?: string | null
          last_payment_error?: Json | null
          metadata?: Json | null
          organization_id: string
          payment_gateway?: string
          payment_method_id?: string | null
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          billing_cycle?: string | null
          billing_method?: string | null
          bypass_until?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          custom_price?: number | null
          id?: string
          last_payment_at?: string | null
          last_payment_error?: Json | null
          metadata?: Json | null
          organization_id?: string
          payment_gateway?: string
          payment_method_id?: string | null
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "saas_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "saas_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "saas_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_template_modules"
            referencedColumns: ["template_id"]
          },
        ]
      }
      saved_replies: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          icon: string | null
          id: string
          is_favorite: boolean | null
          organization_id: string
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          organization_id?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          organization_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      scheduled_workflow_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          context: Json
          created_at: string
          execution_id: string | null
          id: string
          last_error: string | null
          max_attempts: number
          organization_id: string
          resume_from_node_id: string
          scheduled_for: string
          started_at: string | null
          status: Database["public"]["Enums"]["scheduled_job_status"]
          updated_at: string
          workflow_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          context?: Json
          created_at?: string
          execution_id?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          organization_id: string
          resume_from_node_id: string
          scheduled_for: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["scheduled_job_status"]
          updated_at?: string
          workflow_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          context?: Json
          created_at?: string
          execution_id?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          organization_id?: string
          resume_from_node_id?: string
          scheduled_for?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["scheduled_job_status"]
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_workflow_jobs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_workflow_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "scheduled_workflow_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_workflow_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "scheduled_workflow_jobs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string
          resource_entity: string
          resource_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id: string
          resource_entity: string
          resource_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string
          resource_entity?: string
          resource_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "security_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      sentiment_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          auto_escalated: boolean | null
          conversation_id: string
          created_at: string | null
          detected_keywords: string[] | null
          escalated_to: string | null
          id: string
          message_id: string | null
          resolution_notes: string | null
          sentiment_score: number | null
          severity: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          auto_escalated?: boolean | null
          conversation_id: string
          created_at?: string | null
          detected_keywords?: string[] | null
          escalated_to?: string | null
          id?: string
          message_id?: string | null
          resolution_notes?: string | null
          sentiment_score?: number | null
          severity?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          auto_escalated?: boolean | null
          conversation_id?: string
          created_at?: string | null
          detected_keywords?: string[] | null
          escalated_to?: string | null
          id?: string
          message_id?: string | null
          resolution_notes?: string | null
          sentiment_score?: number | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sentiment_alerts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentiment_alerts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          ai_generated_image: boolean | null
          base_price: number | null
          category: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          frequency: string | null
          id: string
          image_url: string | null
          insights_access: string | null
          is_system_template: boolean | null
          is_visible_in_portal: boolean | null
          metadata: Json | null
          name: string
          organization_id: string
          type: string
        }
        Insert: {
          ai_generated_image?: boolean | null
          base_price?: number | null
          category: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          image_url?: string | null
          insights_access?: string | null
          is_system_template?: boolean | null
          is_visible_in_portal?: boolean | null
          metadata?: Json | null
          name: string
          organization_id: string
          type: string
        }
        Update: {
          ai_generated_image?: boolean | null
          base_price?: number | null
          category?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          image_url?: string | null
          insights_access?: string | null
          is_system_template?: boolean | null
          is_visible_in_portal?: boolean | null
          metadata?: Json | null
          name?: string
          organization_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "service_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      service_categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          order_index: number | null
          organization_id: string
          scope: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          order_index?: number | null
          organization_id: string
          scope?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          order_index?: number | null
          organization_id?: string
          scope?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "service_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      services: {
        Row: {
          amount: number | null
          base_price: number | null
          billing_cycle_start_date: string | null
          briefing_template_id: string | null
          category: string | null
          client_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          document_type: string | null
          duration_minutes: number | null
          emitter_id: string | null
          end_date: string | null
          frequency: string | null
          id: string
          insights_access: string | null
          is_catalog_item: boolean | null
          is_visible_in_portal: boolean | null
          metadata: Json | null
          name: string
          next_billing_date: string | null
          organization_id: string
          pricing_model: string | null
          quantity: number | null
          service_start_date: string | null
          start_date: string | null
          status: string | null
          type: string | null
          worker_count: number | null
        }
        Insert: {
          amount?: number | null
          base_price?: number | null
          billing_cycle_start_date?: string | null
          briefing_template_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          document_type?: string | null
          duration_minutes?: number | null
          emitter_id?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          insights_access?: string | null
          is_catalog_item?: boolean | null
          is_visible_in_portal?: boolean | null
          metadata?: Json | null
          name: string
          next_billing_date?: string | null
          organization_id: string
          pricing_model?: string | null
          quantity?: number | null
          service_start_date?: string | null
          start_date?: string | null
          status?: string | null
          type?: string | null
          worker_count?: number | null
        }
        Update: {
          amount?: number | null
          base_price?: number | null
          billing_cycle_start_date?: string | null
          briefing_template_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          document_type?: string | null
          duration_minutes?: number | null
          emitter_id?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          insights_access?: string | null
          is_catalog_item?: boolean | null
          is_visible_in_portal?: boolean | null
          metadata?: Json | null
          name?: string
          next_billing_date?: string | null
          organization_id?: string
          pricing_model?: string | null
          quantity?: number | null
          service_start_date?: string | null
          start_date?: string | null
          status?: string | null
          type?: string | null
          worker_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_emitter_id_fkey"
            columns: ["emitter_id"]
            isOneToOne: false
            referencedRelation: "emitters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      settlements: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          breakdown: Json
          calculated_at: string | null
          created_at: string | null
          event_count: number
          gross_revenue: number
          id: string
          net_payout: number
          paid_at: string | null
          period_end: string
          period_start: string
          platform_fee: number
          reseller_org_id: string
          status: string | null
          stripe_payout_id: string | null
          stripe_transfer_id: string | null
          total_commission: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          breakdown?: Json
          calculated_at?: string | null
          created_at?: string | null
          event_count?: number
          gross_revenue?: number
          id?: string
          net_payout?: number
          paid_at?: string | null
          period_end: string
          period_start: string
          platform_fee?: number
          reseller_org_id: string
          status?: string | null
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
          total_commission?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          breakdown?: Json
          calculated_at?: string | null
          created_at?: string | null
          event_count?: number
          gross_revenue?: number
          id?: string
          net_payout?: number
          paid_at?: string | null
          period_end?: string
          period_start?: string
          platform_fee?: number
          reseller_org_id?: string
          status?: string | null
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
          total_commission?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlements_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_reseller_org_id_fkey"
            columns: ["reseller_org_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "settlements_reseller_org_id_fkey"
            columns: ["reseller_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_reseller_org_id_fkey"
            columns: ["reseller_org_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      staff_payments: {
        Row: {
          account_last_4: string | null
          amount: number
          bank_name: string | null
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          payment_date: string
          payment_method: string
          reference_number: string | null
          registered_by: string | null
          settlement_id: string
          staff_id: string
        }
        Insert: {
          account_last_4?: string | null
          amount: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payment_date: string
          payment_method: string
          reference_number?: string | null
          registered_by?: string | null
          settlement_id: string
          staff_id: string
        }
        Update: {
          account_last_4?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          registered_by?: string | null
          settlement_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "staff_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "staff_payments_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payments_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "staff_payroll_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_payroll_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          id: string
          organization_id: string
          period_end: string
          period_name: string
          period_start: string
          period_type: string | null
          processed_at: string | null
          processed_by: string | null
          staff_count: number | null
          status: string | null
          total_amount: number | null
          total_hours: number | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          organization_id: string
          period_end: string
          period_name: string
          period_start: string
          period_type?: string | null
          processed_at?: string | null
          processed_by?: string | null
          staff_count?: number | null
          status?: string | null
          total_amount?: number | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string
          period_end?: string
          period_name?: string
          period_start?: string
          period_type?: string | null
          processed_at?: string | null
          processed_by?: string | null
          staff_count?: number | null
          status?: string | null
          total_amount?: number | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_payroll_periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payroll_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "staff_payroll_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payroll_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "staff_payroll_periods_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_payroll_settlements: {
        Row: {
          amount_owed: number | null
          amount_paid: number | null
          approved_at: string | null
          approved_by: string | null
          base_amount: number
          bonuses: number | null
          created_at: string | null
          deductions: number | null
          final_amount: number | null
          hourly_rate: number
          id: string
          notes: string | null
          organization_id: string
          payment_status: string | null
          payroll_period_id: string
          staff_id: string
          total_hours: number
          updated_at: string | null
        }
        Insert: {
          amount_owed?: number | null
          amount_paid?: number | null
          approved_at?: string | null
          approved_by?: string | null
          base_amount?: number
          bonuses?: number | null
          created_at?: string | null
          deductions?: number | null
          final_amount?: number | null
          hourly_rate: number
          id?: string
          notes?: string | null
          organization_id: string
          payment_status?: string | null
          payroll_period_id: string
          staff_id: string
          total_hours?: number
          updated_at?: string | null
        }
        Update: {
          amount_owed?: number | null
          amount_paid?: number | null
          approved_at?: string | null
          approved_by?: string | null
          base_amount?: number
          bonuses?: number | null
          created_at?: string | null
          deductions?: number | null
          final_amount?: number | null
          hourly_rate?: number
          id?: string
          notes?: string | null
          organization_id?: string
          payment_status?: string | null
          payroll_period_id?: string
          staff_id?: string
          total_hours?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_payroll_settlements_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payroll_settlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "staff_payroll_settlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payroll_settlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "staff_payroll_settlements_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "staff_payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          color: string | null
          created_at: string | null
          hourly_rate: number | null
          id: string
          member_id: string
          organization_id: string
          skills: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          member_id: string
          organization_id: string
          skills?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          member_id?: string
          organization_id?: string
          skills?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "staff_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          end_time: string
          id: string
          is_active: boolean | null
          organization_id: string
          staff_id: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          end_time: string
          id?: string
          is_active?: boolean | null
          organization_id: string
          staff_id: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
          staff_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "staff_shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "staff_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_work_logs: {
        Row: {
          appointment_id: string | null
          approved_at: string | null
          approved_by: string | null
          calculated_amount: number | null
          created_at: string | null
          end_time: string
          hourly_rate: number
          id: string
          log_type: string | null
          notes: string | null
          organization_id: string
          settled_at: string | null
          staff_id: string
          start_time: string
          total_hours: number | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          calculated_amount?: number | null
          created_at?: string | null
          end_time: string
          hourly_rate: number
          id?: string
          log_type?: string | null
          notes?: string | null
          organization_id: string
          settled_at?: string | null
          staff_id: string
          start_time: string
          total_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          calculated_amount?: number | null
          created_at?: string | null
          end_time?: string
          hourly_rate?: number
          id?: string
          log_type?: string | null
          notes?: string | null
          organization_id?: string
          settled_at?: string | null
          staff_id?: string
          start_time?: string
          total_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_work_logs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_work_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "staff_work_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_work_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      storage_usage: {
        Row: {
          created_at: string | null
          file_count: number | null
          id: string
          last_calculated_at: string | null
          organization_id: string | null
          total_bytes: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_count?: number | null
          id?: string
          last_calculated_at?: string | null
          organization_id?: string | null
          total_bytes?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_count?: number | null
          id?: string
          last_calculated_at?: string | null
          organization_id?: string | null
          total_bytes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storage_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "storage_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          deleted_at: string | null
          frequency: string
          id: string
          invoice_id: string | null
          name: string
          next_billing_date: string | null
          organization_id: string
          service_type: string
          start_date: string
          status: string | null
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          deleted_at?: string | null
          frequency: string
          id?: string
          invoice_id?: string | null
          name: string
          next_billing_date?: string | null
          organization_id: string
          service_type: string
          start_date: string
          status?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          frequency?: string
          id?: string
          invoice_id?: string | null
          name?: string
          next_billing_date?: string | null
          organization_id?: string
          service_type?: string
          start_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          message: string
          severity: string | null
          target_audience: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          severity?: string | null
          target_audience?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          severity?: string | null
          target_audience?: string | null
          title?: string
        }
        Relationships: []
      }
      system_modules: {
        Row: {
          benefits: Json | null
          category: string
          color: string | null
          compatible_verticals: string[] | null
          conflicts_with: string[] | null
          created_at: string
          currency: string | null
          dependencies: Json | null
          description: string | null
          display_order: number | null
          has_client_portal_view: boolean | null
          icon: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          is_addon: boolean | null
          is_core: boolean | null
          is_premium: boolean | null
          key: string
          name: string
          parent_module_key: string | null
          portal_icon_key: string | null
          portal_tab_label: string | null
          price: number | null
          price_monthly: number | null
          requires_configuration: boolean | null
          version: string | null
          visual_metadata: Json | null
        }
        Insert: {
          benefits?: Json | null
          category: string
          color?: string | null
          compatible_verticals?: string[] | null
          conflicts_with?: string[] | null
          created_at?: string
          currency?: string | null
          dependencies?: Json | null
          description?: string | null
          display_order?: number | null
          has_client_portal_view?: boolean | null
          icon?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          is_addon?: boolean | null
          is_core?: boolean | null
          is_premium?: boolean | null
          key: string
          name: string
          parent_module_key?: string | null
          portal_icon_key?: string | null
          portal_tab_label?: string | null
          price?: number | null
          price_monthly?: number | null
          requires_configuration?: boolean | null
          version?: string | null
          visual_metadata?: Json | null
        }
        Update: {
          benefits?: Json | null
          category?: string
          color?: string | null
          compatible_verticals?: string[] | null
          conflicts_with?: string[] | null
          created_at?: string
          currency?: string | null
          dependencies?: Json | null
          description?: string | null
          display_order?: number | null
          has_client_portal_view?: boolean | null
          icon?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          is_addon?: boolean | null
          is_core?: boolean | null
          is_premium?: boolean | null
          key?: string
          name?: string
          parent_module_key?: string | null
          portal_icon_key?: string | null
          portal_tab_label?: string | null
          price?: number | null
          price_monthly?: number | null
          requires_configuration?: boolean | null
          version?: string | null
          visual_metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "system_modules_parent_module_key_fkey"
            columns: ["parent_module_key"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["key"]
          },
        ]
      }
      system_modules_registry: {
        Row: {
          created_at: string | null
          dependencies: string[] | null
          description: string | null
          is_active: boolean | null
          key: string
          name: string
        }
        Insert: {
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          is_active?: boolean | null
          key: string
          name: string
        }
        Update: {
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          is_active?: boolean | null
          key?: string
          name?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          engine: string
          organization_id: string
          period: string
          period_start: string
          updated_at: string | null
          used: number
        }
        Insert: {
          engine: string
          organization_id: string
          period: string
          period_start: string
          updated_at?: string | null
          used?: number
        }
        Update: {
          engine?: string
          organization_id?: string
          period?: string
          period_start?: string
          updated_at?: string | null
          used?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "usage_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      usage_events: {
        Row: {
          action: string
          engine: string
          id: string
          metadata: Json | null
          occurred_at: string
          organization_id: string
          parent_organization_id: string | null
          quantity: number
        }
        Insert: {
          action: string
          engine: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          organization_id: string
          parent_organization_id?: string | null
          quantity?: number
        }
        Update: {
          action?: string
          engine?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          organization_id?: string
          parent_organization_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "usage_events_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "usage_events_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      usage_limits: {
        Row: {
          created_at: string | null
          engine: string
          limit_value: number
          organization_id: string
          period: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          engine: string
          limit_value: number
          organization_id: string
          period: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          engine?: string
          limit_value?: number
          organization_id?: string
          period?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "usage_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      user_passkeys: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          credential_public_key: string
          device_name: string | null
          device_type: string | null
          id: string
          last_used_at: string | null
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          credential_public_key: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          credential_public_key?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          behavior: Json | null
          created_at: string | null
          notifications: Json | null
          shortcuts: Json | null
          theme: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          behavior?: Json | null
          created_at?: string | null
          notifications?: Json | null
          shortcuts?: Json | null
          theme?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          behavior?: Json | null
          created_at?: string | null
          notifications?: Json | null
          shortcuts?: Json | null
          theme?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vertical_modules: {
        Row: {
          created_at: string | null
          id: string
          is_core: boolean | null
          is_default_enabled: boolean | null
          module_key: string
          sort_order: number | null
          vertical_key: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_core?: boolean | null
          is_default_enabled?: boolean | null
          module_key: string
          sort_order?: number | null
          vertical_key: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_core?: boolean | null
          is_default_enabled?: boolean | null
          module_key?: string
          sort_order?: number | null
          vertical_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertical_modules_vertical_key_fkey"
            columns: ["vertical_key"]
            isOneToOne: false
            referencedRelation: "verticals"
            referencedColumns: ["key"]
          },
        ]
      }
      verticals: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          is_active: boolean | null
          key: string
          name: string
          settings: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          is_active?: boolean | null
          key: string
          name: string
          settings?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          is_active?: boolean | null
          key?: string
          name?: string
          settings?: Json | null
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          assigned_staff_id: string | null
          client_id: string | null
          created_at: string | null
          description: string | null
          end_time: string | null
          id: string
          location_address: string | null
          location_type: string | null
          organization_id: string
          price_quoted: number | null
          priority: string | null
          service_id: string | null
          start_time: string | null
          status: string
          title: string
          updated_at: string | null
          vertical: string
        }
        Insert: {
          assigned_staff_id?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          location_address?: string | null
          location_type?: string | null
          organization_id: string
          price_quoted?: number | null
          priority?: string | null
          service_id?: string | null
          start_time?: string | null
          status?: string
          title: string
          updated_at?: string | null
          vertical?: string
        }
        Update: {
          assigned_staff_id?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          location_address?: string | null
          location_type?: string | null
          organization_id?: string
          price_quoted?: number | null
          priority?: string | null
          service_id?: string | null
          start_time?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_work_order_staff"
            columns: ["organization_id", "assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["organization_id", "user_id"]
          },
          {
            foreignKeyName: "work_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "work_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          context: Json | null
          current_step_id: string | null
          error_message: string | null
          id: string
          organization_id: string
          started_at: string | null
          status: string | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          context?: Json | null
          current_step_id?: string | null
          error_message?: string | null
          id?: string
          organization_id: string
          started_at?: string | null
          status?: string | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          context?: Json | null
          current_step_id?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string
          started_at?: string | null
          status?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workflow_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          execution_id: string
          id: string
          level: string | null
          message: string | null
          node_id: string | null
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          execution_id: string
          id?: string
          level?: string | null
          message?: string | null
          node_id?: string | null
          organization_id: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          execution_id?: string
          id?: string
          level?: string | null
          message?: string | null
          node_id?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workflow_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      workflow_pending_inputs: {
        Row: {
          completed_at: string | null
          config: Json
          conversation_id: string | null
          created_at: string
          execution_id: string
          id: string
          input_type: string
          node_id: string
          organization_id: string
          response: Json | null
          status: string
          timeout_at: string | null
        }
        Insert: {
          completed_at?: string | null
          config?: Json
          conversation_id?: string | null
          created_at?: string
          execution_id: string
          id?: string
          input_type: string
          node_id: string
          organization_id: string
          response?: Json | null
          status?: string
          timeout_at?: string | null
        }
        Update: {
          completed_at?: string | null
          config?: Json
          conversation_id?: string | null
          created_at?: string
          execution_id?: string
          id?: string
          input_type?: string
          node_id?: string
          organization_id?: string
          response?: Json | null
          status?: string
          timeout_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_pending_inputs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_pending_inputs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_pending_inputs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workflow_pending_inputs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_pending_inputs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      workflow_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["workflow_role"]
          updated_at: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["workflow_role"]
          updated_at?: string
          user_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["workflow_role"]
          updated_at?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workflow_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workflow_permissions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          definition: Json
          id: string
          is_published: boolean | null
          name: string | null
          version_number: number
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          definition: Json
          id?: string
          is_published?: boolean | null
          name?: string | null
          version_number: number
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          definition?: Json
          id?: string
          is_published?: boolean | null
          name?: string | null
          version_number?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_versions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string | null
          definition: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          organization_id: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          definition?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          organization_id: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          definition?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          organization_id?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
    }
    Views: {
      ai_suggestion_analytics: {
        Row: {
          avg_generation_time_ms: number | null
          date: string | null
          model_used: string | null
          times_used: number | null
          total_suggestions: number | null
          usage_rate: number | null
          used_without_edit: number | null
        }
        Relationships: []
      }
      analytics_daily_usage: {
        Row: {
          action: string | null
          engine: string | null
          event_count: number | null
          organization_id: string | null
          units_consumed: number | null
          usage_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_health_scores: {
        Row: {
          health_score: number | null
          name: string | null
          organization_id: string | null
          payment_status: string | null
          status: string | null
        }
        Insert: {
          health_score?: never
          name?: string | null
          organization_id?: string | null
          payment_status?: string | null
          status?: string | null
        }
        Update: {
          health_score?: never
          name?: string | null
          organization_id?: string | null
          payment_status?: string | null
          status?: string | null
        }
        Relationships: []
      }
      portal_modules_by_app: {
        Row: {
          app_name: string | null
          app_slug: string | null
          display_order: number | null
          is_enabled: boolean | null
          module_slug: string | null
          portal_component_key: string | null
          portal_icon_key: string | null
          portal_tab_label: string | null
          target_portal: string | null
        }
        Relationships: []
      }
      sentiment_analytics: {
        Row: {
          avg_score: number | null
          date: string | null
          message_count: number | null
          sentiment: string | null
          unique_conversations: number | null
        }
        Relationships: []
      }
      system_usage_alerts: {
        Row: {
          alert_level: string | null
          engine: string | null
          limit_value: number | null
          organization_id: string | null
          organization_name: string | null
          parent_organization_id: string | null
          period: string | null
          usage_percentage: number | null
          used_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organizations_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "usage_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "usage_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      v_clients: {
        Row: {
          address: string | null
          avatar_url: string | null
          company_name: string | null
          contact_type: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          facebook: string | null
          id: string | null
          instagram: string | null
          logo_url: string | null
          metadata: Json | null
          name: string | null
          nit: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          portal_config: Json | null
          portal_short_token: string | null
          portal_token: string | null
          portal_token_expires_at: string | null
          portal_token_never_expires: boolean | null
          status: string | null
          tiktok: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          company_name?: string | null
          contact_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          facebook?: string | null
          id?: string | null
          instagram?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string | null
          nit?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          portal_config?: Json | null
          portal_short_token?: string | null
          portal_token?: string | null
          portal_token_expires_at?: string | null
          portal_token_never_expires?: boolean | null
          status?: string | null
          tiktok?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          company_name?: string | null
          contact_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          facebook?: string | null
          id?: string | null
          instagram?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string | null
          nit?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          portal_config?: Json | null
          portal_short_token?: string | null
          portal_token?: string | null
          portal_token_expires_at?: string | null
          portal_token_never_expires?: boolean | null
          status?: string | null
          tiktok?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_organization_templates"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      v_organization_templates: {
        Row: {
          active_module_count: number | null
          app_activated_at: string | null
          organization_id: string | null
          organization_name: string | null
          organization_slug: string | null
          template_category: string | null
          template_id: string | null
          template_name: string | null
          template_price: number | null
          template_slug: string | null
        }
        Relationships: []
      }
      v_template_modules: {
        Row: {
          color: string | null
          icon: string | null
          is_core: boolean | null
          module_category: string | null
          module_description: string | null
          module_key: string | null
          module_name: string | null
          recommended_for_verticals: string[] | null
          template_id: string | null
          template_name: string | null
          template_slug: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_app_to_organization: {
        Args: {
          p_app_id: string
          p_enable_optional_modules?: boolean
          p_organization_id: string
        }
        Returns: Json
      }
      auto_resolve_dependencies: {
        Args: { p_current_active_modules: string[]; p_module_key: string }
        Returns: string[]
      }
      calculate_audit_hash: {
        Args: {
          p_action: string
          p_document_id: string
          p_id: string
          p_organization_id: string
          p_previous_hash: string
          p_timestamp: string
        }
        Returns: string
      }
      calculate_event_commission: {
        Args: { p_event_id: string }
        Returns: {
          calculation_note: string
          client_age_months: number
          commission_amount: number
          phase_name: string
          rule_id: string
        }[]
      }
      calculate_org_storage: {
        Args: { p_organization_id: string }
        Returns: {
          file_count: number
          total_bytes: number
        }[]
      }
      calculate_period_totals: {
        Args: { period_id: string }
        Returns: undefined
      }
      check_member_module_access: {
        Args: { p_module: string; p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      check_member_permission: {
        Args: { p_org_id: string; p_permission: string; p_user_id: string }
        Returns: boolean
      }
      check_storage_limit: {
        Args: { p_file_size_bytes: number; p_organization_id: string }
        Returns: {
          allowed: boolean
          current_usage_bytes: number
          limit_bytes: number
          remaining_bytes: number
          usage_percentage: number
        }[]
      }
      check_workflow_permission: {
        Args: {
          p_required_role: Database["public"]["Enums"]["workflow_role"]
          p_user_id: string
          p_workflow_id: string
        }
        Returns: boolean
      }
      cleanup_expired_passkey_challenges: { Args: never; Returns: undefined }
      cleanup_portal_access_logs: { Args: never; Returns: undefined }
      create_marketing_audience: {
        Args: {
          _cached_count: number
          _created_by: string
          _description: string
          _filter_config: Json
          _name: string
          _organization_id: string
        }
        Returns: Json
      }
      create_marketing_audience_v2: {
        Args: {
          _cached_count: number
          _created_by: string
          _description: string
          _filter_config: Json
          _name: string
          _organization_id: string
        }
        Returns: Json
      }
      decrement_storage_usage: {
        Args: { p_bytes: number; p_organization_id: string }
        Returns: undefined
      }
      execute_scheduled_deletions: {
        Args: never
        Returns: {
          action_taken: string
          org_id: string
          org_name: string
        }[]
      }
      find_conversation_by_phone: {
        Args: { p_org_id: string; p_phone: string }
        Returns: string
      }
      fn_get_next_agent_atomic: {
        Args: {
          p_agent_pool?: string[]
          p_channel_type?: string
          p_connection_id?: string
          p_org_id: string
          p_strategy: string
        }
        Returns: string
      }
      fn_recalculate_agent_load: {
        Args: { p_agent_id: string }
        Returns: undefined
      }
      generate_short_token: { Args: { length?: number }; Returns: string }
      get_active_payment_gateway: {
        Args: never
        Returns: {
          config: Json
          display_name: string
          gateway_name: string
          public_key: string
        }[]
      }
      get_advanced_crm_reports: {
        Args: { p_end_date: string; p_org_id: string; p_start_date: string }
        Returns: Json
      }
      get_agency_dashboard_metrics: {
        Args: { p_org_id: string }
        Returns: Json
      }
      get_agent_monitoring_stats: {
        Args: { p_org_id: string }
        Returns: {
          avatar_url: string
          current_load: number
          last_interaction_at: string
          max_capacity: number
          name: string
          offline_hours_24h: number
          online: boolean
          unread_count: number
          user_id: string
        }[]
      }
      get_auth_org_ids: {
        Args: never
        Returns: {
          organization_id: string
        }[]
      }
      get_briefing_by_token: {
        Args: { p_token: string }
        Returns: {
          client_id: string
          client_name: string
          created_at: string
          id: string
          status: string
          template_id: string
          updated_at: string
        }[]
      }
      get_briefing_responses: {
        Args: { p_briefing_id: string }
        Returns: {
          briefing_id: string | null
          created_at: string | null
          field_id: string | null
          id: string
          updated_at: string | null
          value: Json | null
        }[]
        SetofOptions: {
          from: "*"
          to: "briefing_responses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_client_by_short_token: {
        Args: { token_input: string }
        Returns: {
          company_name: string
          email: string
          id: string
          name: string
          portal_short_token: string
          portal_token: string
        }[]
      }
      get_client_by_token: {
        Args: { token_input: string }
        Returns: {
          company_name: string
          email: string
          id: string
          name: string
          portal_token: string
        }[]
      }
      get_content_text: { Args: { content: Json }; Returns: string }
      get_expiring_trials: {
        Args: never
        Returns: {
          days_remaining: number
          notification_type: string
          org_id: string
          org_name: string
          owner_email: string
        }[]
      }
      get_next_sequence_value: {
        Args: { entity_key: string; org_id: string }
        Returns: number
      }
      get_org_modules_with_fallback: {
        Args: { org_id: string }
        Returns: {
          module_key: string
        }[]
      }
      get_org_storage_limit: {
        Args: { p_organization_id: string }
        Returns: number
      }
      get_orphaned_modules: {
        Args: {
          p_current_active_modules: string[]
          p_module_to_disable: string
        }
        Returns: string[]
      }
      get_paginated_clients: {
        Args: {
          p_org_id: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      get_paginated_leads:
        | {
            Args: {
              p_connection_ids?: string[]
              p_date_from?: string
              p_date_to?: string
              p_org_id: string
              p_page?: number
              p_page_size?: number
              p_search?: string
              p_stage_id?: string
              p_user_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_allowed_channels?: string[]
              p_connection_ids?: string[]
              p_contact_type?: string
              p_date_from?: string
              p_date_to?: string
              p_org_id: string
              p_page?: number
              p_page_size?: number
              p_search?: string
              p_stage_id?: string
              p_user_id?: string
            }
            Returns: Json
          }
      get_pending_scheduled_jobs: {
        Args: { batch_size?: number }
        Returns: {
          attempts: number
          completed_at: string | null
          context: Json
          created_at: string
          execution_id: string | null
          id: string
          last_error: string | null
          max_attempts: number
          organization_id: string
          resume_from_node_id: string
          scheduled_for: string
          started_at: string | null
          status: Database["public"]["Enums"]["scheduled_job_status"]
          updated_at: string
          workflow_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "scheduled_workflow_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_recommended_templates_for_vertical: {
        Args: { p_vertical: string }
        Returns: {
          match_score: number
          module_count: number
          price_monthly: number
          template_category: string
          template_id: string
          template_name: string
          template_slug: string
        }[]
      }
      get_unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      increment_storage_usage: {
        Args: { p_bytes: number; p_organization_id: string }
        Returns: undefined
      }
      increment_usage: {
        Args: {
          p_engine: string
          p_organization_id: string
          p_quantity: number
        }
        Returns: undefined
      }
      is_portal_token_valid: {
        Args: { client_row: Database["public"]["Tables"]["clients"]["Row"] }
        Returns: boolean
      }
      mark_all_notifications_read: {
        Args: { p_user_id: string }
        Returns: number
      }
      process_trial_expirations: {
        Args: never
        Returns: {
          action_taken: string
          org_id: string
          org_name: string
        }[]
      }
      provision_limits: { Args: { target_org_id: string }; Returns: undefined }
      provision_org_limits: {
        Args: { p_organization_id: string; p_plan_code?: string }
        Returns: undefined
      }
      reconcile_agent_loads: {
        Args: { p_org_id?: string }
        Returns: {
          actual_load: number
          agent_id: string
          previous_load: number
          was_fixed: boolean
        }[]
      }
      record_org_activity: {
        Args: {
          p_activity_type?: string
          p_organization_id: string
          p_points?: number
        }
        Returns: undefined
      }
      save_briefing_response: {
        Args: { p_briefing_id: string; p_field_id: string; p_value: Json }
        Returns: undefined
      }
      set_conversation_bot_status: {
        Args: { bot_active: boolean; conv_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_briefing: { Args: { p_briefing_id: string }; Returns: undefined }
      sync_agent_channels_from_permissions_by_data: {
        Args: { p_org_id: string; p_permissions: Json; p_user_id: string }
        Returns: undefined
      }
      upgrade_branding_tier: {
        Args: { p_new_tier_id: string; p_organization_id: string }
        Returns: Json
      }
      upgrade_org_plan: {
        Args: { p_new_plan_code: string; p_organization_id: string }
        Returns: boolean
      }
      validate_module_activation: {
        Args: {
          p_current_active_modules: string[]
          p_module_key: string
          p_organization_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      appointment_status_enum:
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
      briefing_field_type:
        | "text"
        | "textarea"
        | "select"
        | "multiselect"
        | "radio"
        | "checkbox"
        | "date"
        | "upload"
        | "scale"
        | "boolean"
        | "color"
        | "typography"
      briefing_status: "draft" | "sent" | "in_progress" | "submitted" | "locked"
      channel_status: "connected" | "disconnected" | "pending" | "error"
      channel_type: "whatsapp_cloud" | "whatsapp_on_premise" | "email" | "sms"
      dian_status:
        | "EN_PROCESO"
        | "ENVIADA"
        | "ACEPTADA"
        | "RECHAZADA"
        | "CON_ERRORES"
        | "CONTINGENCIA"
      emitter_type: "NATURAL" | "JURIDICO"
      event_trigger_type: "system" | "user" | "webhook"
      knowledge_audience: "staff" | "customer" | "both"
      location_type_enum: "at_headquarters" | "at_client_address" | "remote"
      payment_method_type: "MANUAL" | "GATEWAY"
      resto_session_status: "active" | "payment_pending" | "closed"
      resto_table_shape: "circle" | "square" | "rectangle" | "oval"
      resto_table_status:
        | "available"
        | "occupied"
        | "reserved"
        | "cleaning"
        | "billing"
      scheduled_job_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      smtp_provider_type: "gmail" | "outlook" | "office365" | "zoho" | "custom"
      snapshot_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "restoring"
        | "archived"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "legacy_manual"
      workflow_role: "viewer" | "editor" | "approver" | "admin"
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
      appointment_status_enum: [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      briefing_field_type: [
        "text",
        "textarea",
        "select",
        "multiselect",
        "radio",
        "checkbox",
        "date",
        "upload",
        "scale",
        "boolean",
        "color",
        "typography",
      ],
      briefing_status: ["draft", "sent", "in_progress", "submitted", "locked"],
      channel_status: ["connected", "disconnected", "pending", "error"],
      channel_type: ["whatsapp_cloud", "whatsapp_on_premise", "email", "sms"],
      dian_status: [
        "EN_PROCESO",
        "ENVIADA",
        "ACEPTADA",
        "RECHAZADA",
        "CON_ERRORES",
        "CONTINGENCIA",
      ],
      emitter_type: ["NATURAL", "JURIDICO"],
      event_trigger_type: ["system", "user", "webhook"],
      knowledge_audience: ["staff", "customer", "both"],
      location_type_enum: ["at_headquarters", "at_client_address", "remote"],
      payment_method_type: ["MANUAL", "GATEWAY"],
      resto_session_status: ["active", "payment_pending", "closed"],
      resto_table_shape: ["circle", "square", "rectangle", "oval"],
      resto_table_status: [
        "available",
        "occupied",
        "reserved",
        "cleaning",
        "billing",
      ],
      scheduled_job_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      smtp_provider_type: ["gmail", "outlook", "office365", "zoho", "custom"],
      snapshot_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "restoring",
        "archived",
      ],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "legacy_manual",
      ],
      workflow_role: ["viewer", "editor", "approver", "admin"],
    },
  },
} as const



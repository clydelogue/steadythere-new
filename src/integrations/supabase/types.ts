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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["agent_action_type"]
          created_at: string
          id: string
          latency_ms: number | null
          organization_id: string
          prompt_summary: string | null
          related_event_id: string | null
          response_summary: string | null
          tokens_used: number | null
          user_id: string
          user_modification: string | null
          was_accepted: boolean | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["agent_action_type"]
          created_at?: string
          id?: string
          latency_ms?: number | null
          organization_id: string
          prompt_summary?: string | null
          related_event_id?: string | null
          response_summary?: string | null
          tokens_used?: number | null
          user_id: string
          user_modification?: string | null
          was_accepted?: boolean | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["agent_action_type"]
          created_at?: string
          id?: string
          latency_ms?: number | null
          organization_id?: string
          prompt_summary?: string | null
          related_event_id?: string | null
          response_summary?: string | null
          tokens_used?: number | null
          user_id?: string
          user_modification?: string | null
          was_accepted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          event_id: string | null
          filename: string
          id: string
          milestone_id: string | null
          mime_type: string | null
          organization_id: string
          size_bytes: number | null
          source: Database["public"]["Enums"]["document_source"]
          source_email_from: string | null
          source_email_subject: string | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          event_id?: string | null
          filename: string
          id?: string
          milestone_id?: string | null
          mime_type?: string | null
          organization_id: string
          size_bytes?: number | null
          source?: Database["public"]["Enums"]["document_source"]
          source_email_from?: string | null
          source_email_subject?: string | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          event_id?: string | null
          filename?: string
          id?: string
          milestone_id?: string | null
          mime_type?: string | null
          organization_id?: string
          size_bytes?: number | null
          source?: Database["public"]["Enums"]["document_source"]
          source_email_from?: string | null
          source_email_subject?: string | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          created_at: string
          default_reminder_days: number[] | null
          description: string | null
          icon: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_reminder_days?: number[] | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_reminder_days?: number[] | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          event_date: string
          event_end_date: string | null
          event_type_id: string | null
          id: string
          is_virtual: boolean | null
          name: string
          organization_id: string
          owner_id: string | null
          reminder_days: number[] | null
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
          venue: string | null
          virtual_link: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          event_end_date?: string | null
          event_type_id?: string | null
          id?: string
          is_virtual?: boolean | null
          name: string
          organization_id: string
          owner_id?: string | null
          reminder_days?: number[] | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          venue?: string | null
          virtual_link?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_end_date?: string | null
          event_type_id?: string | null
          id?: string
          is_virtual?: boolean | null
          name?: string
          organization_id?: string
          owner_id?: string | null
          reminder_days?: number[] | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          venue?: string | null
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learned_patterns: {
        Row: {
          applied_count: number | null
          confidence: number | null
          created_at: string
          description: string
          id: string
          is_active: boolean | null
          organization_id: string
          pattern_type: Database["public"]["Enums"]["pattern_type"]
          recommendation: string | null
          source_event_ids: string[] | null
          updated_at: string
        }
        Insert: {
          applied_count?: number | null
          confidence?: number | null
          created_at?: string
          description: string
          id?: string
          is_active?: boolean | null
          organization_id: string
          pattern_type: Database["public"]["Enums"]["pattern_type"]
          recommendation?: string | null
          source_event_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          applied_count?: number | null
          confidence?: number | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
          pattern_type?: Database["public"]["Enums"]["pattern_type"]
          recommendation?: string | null
          source_event_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learned_patterns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_templates: {
        Row: {
          category: Database["public"]["Enums"]["milestone_category"]
          created_at: string
          days_before_event: number
          description: string | null
          estimated_hours: number | null
          event_type_id: string
          id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["milestone_category"]
          created_at?: string
          days_before_event?: number
          description?: string | null
          estimated_hours?: number | null
          event_type_id: string
          id?: string
          sort_order?: number | null
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["milestone_category"]
          created_at?: string
          days_before_event?: number
          description?: string | null
          estimated_hours?: number | null
          event_type_id?: string
          id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_templates_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          actual_hours: number | null
          assignee_id: string | null
          category: Database["public"]["Enums"]["milestone_category"]
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          estimated_hours: number | null
          event_id: string
          from_template_id: string | null
          id: string
          is_ai_generated: boolean | null
          sort_order: number | null
          status: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at: string
          was_modified: boolean | null
        }
        Insert: {
          actual_hours?: number | null
          assignee_id?: string | null
          category?: Database["public"]["Enums"]["milestone_category"]
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          estimated_hours?: number | null
          event_id: string
          from_template_id?: string | null
          id?: string
          is_ai_generated?: boolean | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at?: string
          was_modified?: boolean | null
        }
        Update: {
          actual_hours?: number | null
          assignee_id?: string | null
          category?: Database["public"]["Enums"]["milestone_category"]
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          estimated_hours?: number | null
          event_id?: string
          from_template_id?: string | null
          id?: string
          is_ai_generated?: boolean | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["milestone_status"]
          title?: string
          updated_at?: string
          was_modified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_from_template_id_fkey"
            columns: ["from_template_id"]
            isOneToOne: false
            referencedRelation: "milestone_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          organization_id: string
          related_event_id: string | null
          related_milestone_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          organization_id: string
          related_event_id?: string | null
          related_milestone_id?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          organization_id?: string
          related_event_id?: string | null
          related_milestone_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_milestone_id_fkey"
            columns: ["related_milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          default_reminder_days: number[] | null
          digest_day: number | null
          digest_enabled: boolean | null
          digest_time: string | null
          id: string
          inbound_email_address: string | null
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_reminder_days?: number[] | null
          digest_day?: number | null
          digest_enabled?: boolean | null
          digest_time?: string | null
          id?: string
          inbound_email_address?: string | null
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_reminder_days?: number[] | null
          digest_day?: number | null
          digest_enabled?: boolean | null
          digest_time?: string | null
          id?: string
          inbound_email_address?: string | null
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agent_action_type:
        | "MILESTONE_GENERATION"
        | "MILESTONE_IMPROVEMENT"
        | "CONTEXTUAL_HELP"
        | "POST_EVENT_ANALYSIS"
        | "TEMPLATE_UPDATE"
      document_category:
        | "CONTRACT"
        | "INVOICE"
        | "PERMIT"
        | "MARKETING"
        | "PHOTO"
        | "REPORT"
        | "CORRESPONDENCE"
        | "UNCATEGORIZED"
      document_source: "UPLOAD" | "EMAIL" | "GENERATED"
      event_status:
        | "PLANNING"
        | "ACTIVE"
        | "COMPLETED"
        | "CANCELLED"
        | "ARCHIVED"
      milestone_category:
        | "VENUE"
        | "CATERING"
        | "MARKETING"
        | "LOGISTICS"
        | "PERMITS"
        | "SPONSORS"
        | "VOLUNTEERS"
        | "GENERAL"
      milestone_status:
        | "NOT_STARTED"
        | "IN_PROGRESS"
        | "BLOCKED"
        | "COMPLETED"
        | "SKIPPED"
      notification_channel: "EMAIL" | "SMS" | "IN_APP"
      notification_status:
        | "PENDING"
        | "SENT"
        | "DELIVERED"
        | "FAILED"
        | "CANCELLED"
      notification_type:
        | "REMINDER"
        | "OVERDUE"
        | "ESCALATION"
        | "ASSIGNMENT"
        | "DIGEST"
        | "WELCOME"
        | "EVENT_UPDATE"
      org_role: "owner" | "admin" | "member"
      pattern_type:
        | "TIMING_ADJUSTMENT"
        | "NEW_MILESTONE"
        | "REMOVE_MILESTONE"
        | "SEQUENCE_CHANGE"
        | "RESOURCE_SUGGESTION"
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
      agent_action_type: [
        "MILESTONE_GENERATION",
        "MILESTONE_IMPROVEMENT",
        "CONTEXTUAL_HELP",
        "POST_EVENT_ANALYSIS",
        "TEMPLATE_UPDATE",
      ],
      document_category: [
        "CONTRACT",
        "INVOICE",
        "PERMIT",
        "MARKETING",
        "PHOTO",
        "REPORT",
        "CORRESPONDENCE",
        "UNCATEGORIZED",
      ],
      document_source: ["UPLOAD", "EMAIL", "GENERATED"],
      event_status: [
        "PLANNING",
        "ACTIVE",
        "COMPLETED",
        "CANCELLED",
        "ARCHIVED",
      ],
      milestone_category: [
        "VENUE",
        "CATERING",
        "MARKETING",
        "LOGISTICS",
        "PERMITS",
        "SPONSORS",
        "VOLUNTEERS",
        "GENERAL",
      ],
      milestone_status: [
        "NOT_STARTED",
        "IN_PROGRESS",
        "BLOCKED",
        "COMPLETED",
        "SKIPPED",
      ],
      notification_channel: ["EMAIL", "SMS", "IN_APP"],
      notification_status: [
        "PENDING",
        "SENT",
        "DELIVERED",
        "FAILED",
        "CANCELLED",
      ],
      notification_type: [
        "REMINDER",
        "OVERDUE",
        "ESCALATION",
        "ASSIGNMENT",
        "DIGEST",
        "WELCOME",
        "EVENT_UPDATE",
      ],
      org_role: ["owner", "admin", "member"],
      pattern_type: [
        "TIMING_ADJUSTMENT",
        "NEW_MILESTONE",
        "REMOVE_MILESTONE",
        "SEQUENCE_CHANGE",
        "RESOURCE_SUGGESTION",
      ],
    },
  },
} as const

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
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      anc_visits: {
        Row: {
          account_id: string | null
          actual_date: string | null
          client_id: string
          created_at: string
          gestational_weeks: number
          id: string
          notes: string | null
          scheduled_date: string
          status: string
          visit_name: string
          visit_number: number
        }
        Insert: {
          account_id?: string | null
          actual_date?: string | null
          client_id: string
          created_at?: string
          gestational_weeks: number
          id?: string
          notes?: string | null
          scheduled_date: string
          status?: string
          visit_name: string
          visit_number: number
        }
        Update: {
          account_id?: string | null
          actual_date?: string | null
          client_id?: string
          created_at?: string
          gestational_weeks?: number
          id?: string
          notes?: string | null
          scheduled_date?: string
          status?: string
          visit_name?: string
          visit_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "anc_visits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anc_visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          account_id: string | null
          action: string
          created_at: string
          device_type: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          action: string
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          action?: string
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          account_id: string | null
          address: string
          assigned_to: string
          child_dob: string | null
          child_name: string | null
          contact: string
          created_at: string
          due_date: string
          edd: string | null
          facility_id: string | null
          id: string
          lasraa_id: string | null
          lmp: string | null
          name: string
          nin_id: string | null
          preferred_channel: string
          service: string
          status: string
          system_id: string | null
          trimester: number | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          address: string
          assigned_to?: string
          child_dob?: string | null
          child_name?: string | null
          contact: string
          created_at?: string
          due_date: string
          edd?: string | null
          facility_id?: string | null
          id: string
          lasraa_id?: string | null
          lmp?: string | null
          name: string
          nin_id?: string | null
          preferred_channel?: string
          service: string
          status?: string
          system_id?: string | null
          trimester?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          address?: string
          assigned_to?: string
          child_dob?: string | null
          child_name?: string | null
          contact?: string
          created_at?: string
          due_date?: string
          edd?: string | null
          facility_id?: string | null
          id?: string
          lasraa_id?: string | null
          lmp?: string | null
          name?: string
          nin_id?: string | null
          preferred_channel?: string
          service?: string
          status?: string
          system_id?: string | null
          trimester?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      epi_schedule: {
        Row: {
          age_weeks: number
          description: string | null
          id: string
          vaccine_name: string
        }
        Insert: {
          age_weeks: number
          description?: string | null
          id?: string
          vaccine_name: string
        }
        Update: {
          age_weeks?: number
          description?: string | null
          id?: string
          vaccine_name?: string
        }
        Relationships: []
      }
      facilities: {
        Row: {
          account_id: string
          address: string | null
          created_at: string
          id: string
          lga: string | null
          local_government: string | null
          name: string
          updated_at: string
          ward: string | null
        }
        Insert: {
          account_id: string
          address?: string | null
          created_at?: string
          id?: string
          lga?: string | null
          local_government?: string | null
          name: string
          updated_at?: string
          ward?: string | null
        }
        Update: {
          account_id?: string
          address?: string | null
          created_at?: string
          id?: string
          lga?: string | null
          local_government?: string | null
          name?: string
          updated_at?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facilities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      immunization_records: {
        Row: {
          account_id: string | null
          administered_date: string | null
          age_weeks: number | null
          client_id: string
          created_at: string
          due_date: string
          id: string
          status: string
          vaccine_name: string
        }
        Insert: {
          account_id?: string | null
          administered_date?: string | null
          age_weeks?: number | null
          client_id: string
          created_at?: string
          due_date: string
          id?: string
          status?: string
          vaccine_name: string
        }
        Update: {
          account_id?: string | null
          administered_date?: string | null
          age_weeks?: number | null
          client_id?: string
          created_at?: string
          due_date?: string
          id?: string
          status?: string
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "immunization_records_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immunization_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          account_id: string
          created_at: string
          email: string
          expires_at: string
          facility_id: string | null
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          account_id: string
          created_at?: string
          email: string
          expires_at?: string
          facility_id?: string | null
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          facility_id?: string | null
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          defaulter_email: boolean
          defaulter_in_app: boolean
          id: string
          reminder_email: boolean
          reminder_in_app: boolean
          transfer_email: boolean
          transfer_in_app: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          defaulter_email?: boolean
          defaulter_in_app?: boolean
          id?: string
          reminder_email?: boolean
          reminder_in_app?: boolean
          transfer_email?: boolean
          transfer_in_app?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          defaulter_email?: boolean
          defaulter_in_app?: boolean
          id?: string
          reminder_email?: boolean
          reminder_in_app?: boolean
          transfer_email?: boolean
          transfer_in_app?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_reminders: {
        Row: {
          account_id: string | null
          created_at: string
          delivery_status: string
          delivery_updated_at: string | null
          error_detail: string | null
          external_message_id: string | null
          id: string
          max_retries: number
          message: string
          patient_id: string
          reminder_category: string
          reminder_type: string
          retry_count: number
          scheduled_for: string | null
          sent_at: string
          status: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          delivery_status?: string
          delivery_updated_at?: string | null
          error_detail?: string | null
          external_message_id?: string | null
          id?: string
          max_retries?: number
          message: string
          patient_id: string
          reminder_category?: string
          reminder_type: string
          retry_count?: number
          scheduled_for?: string | null
          sent_at?: string
          status?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          delivery_status?: string
          delivery_updated_at?: string | null
          error_detail?: string | null
          external_message_id?: string | null
          id?: string
          max_retries?: number
          message?: string
          patient_id?: string
          reminder_category?: string
          reminder_type?: string
          retry_count?: number
          scheduled_for?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_reminders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_reminders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_id: string
          created_at: string
          facility_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          lga: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          facility_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lga?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          facility_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lga?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_requests: {
        Row: {
          approved_by: string | null
          client_id: string
          created_at: string
          id: string
          notes: string | null
          requested_by: string
          source_account_id: string
          source_facility_id: string
          status: string
          target_account_id: string
          target_facility_id: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          requested_by: string
          source_account_id: string
          source_facility_id: string
          status?: string
          target_account_id: string
          target_facility_id: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          requested_by?: string
          source_account_id?: string
          source_facility_id?: string
          status?: string
          target_account_id?: string
          target_facility_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_requests_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_source_facility_id_fkey"
            columns: ["source_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_target_account_id_fkey"
            columns: ["target_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_target_facility_id_fkey"
            columns: ["target_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_detect_defaulters: { Args: never; Returns: number }
      get_user_account_id: { Args: { _user_id: string }; Returns: string }
      get_user_facility_id: { Args: { _user_id: string }; Returns: string }
      get_user_lga: { Args: { _user_id: string }; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_user_audit_event: {
        Args: {
          _action: string
          _new_data: Json
          _record_id: string
          _table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "system_admin"
        | "program_manager"
        | "facility_officer"
        | "data_entry_officer"
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
      app_role: [
        "system_admin",
        "program_manager",
        "facility_officer",
        "data_entry_officer",
      ],
    },
  },
} as const

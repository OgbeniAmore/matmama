export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      epi_schedule: {
        Row: {
          age_months: number | null
          age_weeks: number | null
          created_at: string
          description: string | null
          id: string
          vaccine_name: string
        }
        Insert: {
          age_months?: number | null
          age_weeks?: number | null
          created_at?: string
          description?: string | null
          id?: string
          vaccine_name: string
        }
        Update: {
          age_months?: number | null
          age_weeks?: number | null
          created_at?: string
          description?: string | null
          id?: string
          vaccine_name?: string
        }
        Relationships: []
      }
      immunization_records: {
        Row: {
          administered_date: string | null
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          scheduled_date: string
          status: string
          updated_at: string
          vaccine_name: string
        }
        Insert: {
          administered_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          scheduled_date: string
          status?: string
          updated_at?: string
          vaccine_name: string
        }
        Update: {
          administered_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          scheduled_date?: string
          status?: string
          updated_at?: string
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "immunization_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string
          assigned_to: string
          child_dob: string | null
          child_name: string | null
          contact: string
          created_at: string
          due_date: string
          edd: string | null
          id: string
          name: string
          service: Database["public"]["Enums"]["patient_service"]
          status: Database["public"]["Enums"]["patient_status"]
          trimester: number | null
          updated_at: string
        }
        Insert: {
          address: string
          assigned_to: string
          child_dob?: string | null
          child_name?: string | null
          contact: string
          created_at?: string
          due_date: string
          edd?: string | null
          id: string
          name: string
          service: Database["public"]["Enums"]["patient_service"]
          status: Database["public"]["Enums"]["patient_status"]
          trimester?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          assigned_to?: string
          child_dob?: string | null
          child_name?: string | null
          contact?: string
          created_at?: string
          due_date?: string
          edd?: string | null
          id?: string
          name?: string
          service?: Database["public"]["Enums"]["patient_service"]
          status?: Database["public"]["Enums"]["patient_status"]
          trimester?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string
          facility: string | null
          first_name: string | null
          id: string
          last_name: string | null
          local_government: string | null
          state: string
          ward: string | null
        }
        Insert: {
          country?: string
          facility?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          local_government?: string | null
          state?: string
          ward?: string | null
        }
        Update: {
          country?: string
          facility?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          local_government?: string | null
          state?: string
          ward?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_anc_patient_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      patient_service:
        | "Routine Immunization"
        | "Family Planning"
        | "Ante Natal Care"
      patient_status: "On Track" | "Defaulting" | "Completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      patient_service: [
        "Routine Immunization",
        "Family Planning",
        "Ante Natal Care",
      ],
      patient_status: ["On Track", "Defaulting", "Completed"],
    },
  },
} as const

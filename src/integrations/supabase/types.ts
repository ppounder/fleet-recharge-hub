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
      commercial_terms: {
        Row: {
          created_at: string
          fleet_id: string
          id: string
          provider_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fleet_id: string
          id?: string
          provider_id: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fleet_id?: string
          id?: string
          provider_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_terms_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_terms_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      fleets: {
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
      invoices: {
        Row: {
          amount: number
          created_at: string
          fleet_manager_id: string | null
          id: string
          invoice_number: string
          issued_at: string | null
          job_id: string
          paid_at: string | null
          provider_id: string
          status: string
          total: number
          vat: number
        }
        Insert: {
          amount?: number
          created_at?: string
          fleet_manager_id?: string | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          job_id: string
          paid_at?: string | null
          provider_id: string
          status?: string
          total?: number
          vat?: number
        }
        Update: {
          amount?: number
          created_at?: string
          fleet_manager_id?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          job_id?: string
          paid_at?: string | null
          provider_id?: string
          status?: string
          total?: number
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          booking_date: string | null
          booking_reference: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          customer_id: string | null
          depot: string | null
          description: string | null
          estimate_total: number
          fleet_manager_id: string | null
          fleet_reference: string | null
          has_recharge: boolean
          id: string
          invoice_total: number
          job_number: string
          priority: string
          provider_id: string | null
          recharge_amount: number | null
          status: string
          type: string
          updated_at: string
          vehicle_id: string | null
          vehicle_make_model: string | null
          vehicle_reg: string
        }
        Insert: {
          booking_date?: string | null
          booking_reference?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id?: string | null
          depot?: string | null
          description?: string | null
          estimate_total?: number
          fleet_manager_id?: string | null
          fleet_reference?: string | null
          has_recharge?: boolean
          id?: string
          invoice_total?: number
          job_number: string
          priority?: string
          provider_id?: string | null
          recharge_amount?: number | null
          status?: string
          type?: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_make_model?: string | null
          vehicle_reg: string
        }
        Update: {
          booking_date?: string | null
          booking_reference?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id?: string | null
          depot?: string | null
          description?: string | null
          estimate_total?: number
          fleet_manager_id?: string | null
          fleet_reference?: string | null
          has_recharge?: boolean
          id?: string
          invoice_total?: number
          job_number?: string
          priority?: string
          provider_id?: string | null
          recharge_amount?: number | null
          status?: string
          type?: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_make_model?: string | null
          vehicle_reg?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      labour_rates: {
        Row: {
          cost: number
          created_at: string
          fleet_id: string
          id: string
          is_default: boolean
          name: string
          provider_id: string
          updated_at: string
        }
        Insert: {
          cost?: number
          created_at?: string
          fleet_id: string
          id?: string
          is_default?: boolean
          name: string
          provider_id: string
          updated_at?: string
        }
        Update: {
          cost?: number
          created_at?: string
          fleet_id?: string
          id?: string
          is_default?: boolean
          name?: string
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labour_rates_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_rates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string | null
          fleet_id: string | null
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          fleet_id?: string | null
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          fleet_id?: string | null
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_menu_items: {
        Row: {
          created_at: string
          description: string
          fleet_id: string
          id: string
          job_type: string
          provider_id: string
          unit_price: number
          updated_at: string
          work_code_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          fleet_id: string
          id?: string
          job_type?: string
          provider_id: string
          unit_price?: number
          updated_at?: string
          work_code_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          fleet_id?: string
          id?: string
          job_type?: string
          provider_id?: string
          unit_price?: number
          updated_at?: string
          work_code_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_menu_items_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_menu_items_work_code_id_fkey"
            columns: ["work_code_id"]
            isOneToOne: false
            referencedRelation: "work_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      recharges: {
        Row: {
          cost: number
          created_at: string
          customer_id: string | null
          description: string | null
          evidence: string[] | null
          id: string
          job_id: string
          reason_code: string
          status: string
          updated_at: string
          vehicle_reg: string
        }
        Insert: {
          cost?: number
          created_at?: string
          customer_id?: string | null
          description?: string | null
          evidence?: string[] | null
          id?: string
          job_id: string
          reason_code: string
          status?: string
          updated_at?: string
          vehicle_reg: string
        }
        Update: {
          cost?: number
          created_at?: string
          customer_id?: string | null
          description?: string | null
          evidence?: string[] | null
          id?: string
          job_id?: string
          reason_code?: string
          status?: string
          updated_at?: string
          vehicle_reg?: string
        }
        Relationships: [
          {
            foreignKeyName: "recharges_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vat_bands: {
        Row: {
          created_at: string
          id: string
          name: string
          percentage: number
          provider_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          percentage?: number
          provider_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          percentage?: number
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vat_bands_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          customer_id: string | null
          fleet_id: string | null
          fleet_manager_id: string | null
          id: string
          make: string
          mileage: number | null
          model: string
          mot_due: string | null
          next_service: string | null
          registration: string
          status: string
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          fleet_id?: string | null
          fleet_manager_id?: string | null
          id?: string
          make: string
          mileage?: number | null
          model: string
          mot_due?: string | null
          next_service?: string | null
          registration: string
          status?: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          fleet_id?: string | null
          fleet_manager_id?: string | null
          id?: string
          make?: string
          mileage?: number | null
          model?: string
          mot_due?: string | null
          next_service?: string | null
          registration?: string
          status?: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
        ]
      }
      work_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          provider_id: string
          updated_at: string
          vat_band_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          provider_id: string
          updated_at?: string
          vat_band_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          provider_id?: string
          updated_at?: string
          vat_band_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_types_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_types_vat_band_id_fkey"
            columns: ["vat_band_id"]
            isOneToOne: false
            referencedRelation: "vat_bands"
            referencedColumns: ["id"]
          },
        ]
      }
      work_codes: {
        Row: {
          created_at: string
          id: string
          name: string
          provider_id: string
          updated_at: string
          vat_band_id: string | null
          work_category_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          provider_id: string
          updated_at?: string
          vat_band_id?: string | null
          work_category_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          provider_id?: string
          updated_at?: string
          vat_band_id?: string | null
          work_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_codes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_codes_vat_band_id_fkey"
            columns: ["vat_band_id"]
            isOneToOne: false
            referencedRelation: "vat_bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_codes_work_category_id_fkey"
            columns: ["work_category_id"]
            isOneToOne: false
            referencedRelation: "work_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_labour: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          labour_rate_id: string
          labour_rate_name: string
          total: number
          units: number
          work_item_id: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          labour_rate_id: string
          labour_rate_name?: string
          total?: number
          units?: number
          work_item_id: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          labour_rate_id?: string
          labour_rate_name?: string
          total?: number
          units?: number
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_labour_labour_rate_id_fkey"
            columns: ["labour_rate_id"]
            isOneToOne: false
            referencedRelation: "labour_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_labour_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_items: {
        Row: {
          created_at: string
          description: string
          id: string
          job_id: string
          quantity: number
          recharge_reason: string | null
          rechargeable: boolean
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          job_id: string
          quantity?: number
          recharge_reason?: string | null
          rechargeable?: boolean
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          job_id?: string
          quantity?: number
          recharge_reason?: string | null
          rechargeable?: boolean
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "fleet-manager" | "service-provider" | "customer"
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
      app_role: ["fleet-manager", "service-provider", "customer"],
    },
  },
} as const

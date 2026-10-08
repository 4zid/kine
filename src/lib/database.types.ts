// Generado desde Supabase (proyecto "kine"). Regenerar tras cada migración.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      clinical_histories: {
        Row: {
          alcohol: string | null
          allergies: string | null
          blood_pressure: string | null
          conditions: string[]
          conditions_notes: string | null
          created_at: string
          family_history: string | null
          fractures: string | null
          functional_scales: Json
          gait_assessment: string | null
          heart_rate: number | null
          height_cm: number | null
          long_term_goals: string | null
          medications: string | null
          muscle_strength: Json
          oxygen_saturation: number | null
          palpation: string | null
          patient_id: string
          physical_activity: string | null
          physical_activity_frequency: string | null
          posture_assessment: string | null
          prescribed_sessions: number | null
          previous_treatments: string | null
          professional_id: string
          range_of_motion: Json
          red_flags: string | null
          respiratory_rate: number | null
          session_frequency: string | null
          short_term_goals: string | null
          sleep_hours: number | null
          sleep_quality: string | null
          smoking: string | null
          special_tests: Json
          stress_level: number | null
          surgeries: string | null
          treatment_plan: string | null
          updated_at: string
          weight_kg: number | null
          work_posture_notes: string | null
          work_type: string | null
        }
        Insert: {
          alcohol?: string | null
          allergies?: string | null
          blood_pressure?: string | null
          conditions?: string[]
          conditions_notes?: string | null
          created_at?: string
          family_history?: string | null
          fractures?: string | null
          functional_scales?: Json
          gait_assessment?: string | null
          heart_rate?: number | null
          height_cm?: number | null
          long_term_goals?: string | null
          medications?: string | null
          muscle_strength?: Json
          oxygen_saturation?: number | null
          palpation?: string | null
          patient_id: string
          physical_activity?: string | null
          physical_activity_frequency?: string | null
          posture_assessment?: string | null
          prescribed_sessions?: number | null
          previous_treatments?: string | null
          professional_id?: string
          range_of_motion?: Json
          red_flags?: string | null
          respiratory_rate?: number | null
          session_frequency?: string | null
          short_term_goals?: string | null
          sleep_hours?: number | null
          sleep_quality?: string | null
          smoking?: string | null
          special_tests?: Json
          stress_level?: number | null
          surgeries?: string | null
          treatment_plan?: string | null
          updated_at?: string
          weight_kg?: number | null
          work_posture_notes?: string | null
          work_type?: string | null
        }
        Update: {
          alcohol?: string | null
          allergies?: string | null
          blood_pressure?: string | null
          conditions?: string[]
          conditions_notes?: string | null
          created_at?: string
          family_history?: string | null
          fractures?: string | null
          functional_scales?: Json
          gait_assessment?: string | null
          heart_rate?: number | null
          height_cm?: number | null
          long_term_goals?: string | null
          medications?: string | null
          muscle_strength?: Json
          oxygen_saturation?: number | null
          palpation?: string | null
          patient_id?: string
          physical_activity?: string | null
          physical_activity_frequency?: string | null
          posture_assessment?: string | null
          prescribed_sessions?: number | null
          previous_treatments?: string | null
          professional_id?: string
          range_of_motion?: Json
          red_flags?: string | null
          respiratory_rate?: number | null
          session_frequency?: string | null
          short_term_goals?: string | null
          sleep_hours?: number | null
          sleep_quality?: string | null
          smoking?: string | null
          special_tests?: Json
          stress_level?: number | null
          surgeries?: string | null
          treatment_plan?: string | null
          updated_at?: string
          weight_kg?: number | null
          work_posture_notes?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_histories_patient_fk"
            columns: ["patient_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "patient_overview"
            referencedColumns: ["id", "professional_id"]
          },
          {
            foreignKeyName: "clinical_histories_patient_fk"
            columns: ["patient_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id", "professional_id"]
          },
        ]
      }
      pain_records: {
        Row: {
          aggravating_factors: string | null
          created_at: string
          frequency: string | null
          id: string
          intensity: number
          irradiation: string | null
          notes: string | null
          pain_types: string[]
          patient_id: string
          point_x: number | null
          point_y: number | null
          professional_id: string
          recorded_at: string
          region: string
          relieving_factors: string | null
          session_id: string | null
          started_on: string | null
          status: string
          view: string
        }
        Insert: {
          aggravating_factors?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          intensity: number
          irradiation?: string | null
          notes?: string | null
          pain_types?: string[]
          patient_id: string
          point_x?: number | null
          point_y?: number | null
          professional_id?: string
          recorded_at?: string
          region: string
          relieving_factors?: string | null
          session_id?: string | null
          started_on?: string | null
          status?: string
          view: string
        }
        Update: {
          aggravating_factors?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          intensity?: number
          irradiation?: string | null
          notes?: string | null
          pain_types?: string[]
          patient_id?: string
          point_x?: number | null
          point_y?: number | null
          professional_id?: string
          recorded_at?: string
          region?: string
          relieving_factors?: string | null
          session_id?: string | null
          started_on?: string | null
          status?: string
          view?: string
        }
        Relationships: [
          {
            foreignKeyName: "pain_records_patient_fk"
            columns: ["patient_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "patient_overview"
            referencedColumns: ["id", "professional_id"]
          },
          {
            foreignKeyName: "pain_records_patient_fk"
            columns: ["patient_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id", "professional_id"]
          },
          {
            foreignKeyName: "pain_records_session_fk"
            columns: ["session_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "treatment_sessions"
            referencedColumns: ["id", "professional_id"]
          },
        ]
      }
      patient_studies: {
        Row: {
          created_at: string
          file_name: string | null
          file_path: string | null
          findings: string | null
          id: string
          kind: string
          mime_type: string | null
          patient_id: string
          professional_id: string
          size_bytes: number | null
          study_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          findings?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          patient_id: string
          professional_id?: string
          size_bytes?: number | null
          study_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          findings?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          patient_id?: string
          professional_id?: string
          size_bytes?: number | null
          study_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_studies_patient_fk"
            columns: ["patient_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "patient_overview"
            referencedColumns: ["id", "professional_id"]
          },
          {
            foreignKeyName: "patient_studies_patient_fk"
            columns: ["patient_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id", "professional_id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          archived_at: string | null
          birth_date: string | null
          city: string | null
          consultation_reason: string | null
          created_at: string
          discharged_at: string | null
          document_number: string | null
          document_type: string
          dominant_side: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          first_name: string
          gender_identity: string | null
          health_insurance: string | null
          health_insurance_number: string | null
          health_insurance_plan: string | null
          id: string
          injury_mechanism: string | null
          kinesic_diagnosis: string | null
          last_name: string
          medical_diagnosis: string | null
          notes: string | null
          occupation: string | null
          onset_date: string | null
          phone: string | null
          professional_id: string
          referring_doctor: string | null
          sex: string | null
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          birth_date?: string | null
          city?: string | null
          consultation_reason?: string | null
          created_at?: string
          discharged_at?: string | null
          document_number?: string | null
          document_type?: string
          dominant_side?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          first_name: string
          gender_identity?: string | null
          health_insurance?: string | null
          health_insurance_number?: string | null
          health_insurance_plan?: string | null
          id?: string
          injury_mechanism?: string | null
          kinesic_diagnosis?: string | null
          last_name: string
          medical_diagnosis?: string | null
          notes?: string | null
          occupation?: string | null
          onset_date?: string | null
          phone?: string | null
          professional_id?: string
          referring_doctor?: string | null
          sex?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          birth_date?: string | null
          city?: string | null
          consultation_reason?: string | null
          created_at?: string
          discharged_at?: string | null
          document_number?: string | null
          document_type?: string
          dominant_side?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          first_name?: string
          gender_identity?: string | null
          health_insurance?: string | null
          health_insurance_number?: string | null
          health_insurance_plan?: string | null
          id?: string
          injury_mechanism?: string | null
          kinesic_diagnosis?: string | null
          last_name?: string
          medical_diagnosis?: string | null
          notes?: string | null
          occupation?: string | null
          onset_date?: string | null
          phone?: string | null
          professional_id?: string
          referring_doctor?: string | null
          sex?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          clinic_address: string | null
          clinic_name: string | null
          country: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          license_number: string | null
          license_province: string | null
          license_type: string | null
          onboarding_completed_at: string | null
          phone: string | null
          province: string | null
          specialties: string[]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          clinic_address?: string | null
          clinic_name?: string | null
          country?: string
          created_at?: string
          email?: string
          first_name?: string
          id: string
          last_name?: string
          license_number?: string | null
          license_province?: string | null
          license_type?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          province?: string | null
          specialties?: string[]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          clinic_address?: string | null
          clinic_name?: string | null
          country?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          license_number?: string | null
          license_province?: string | null
          license_type?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          province?: string | null
          specialties?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      treatment_sessions: {
        Row: {
          assessment: string | null
          attendance: string
          created_at: string
          duration_minutes: number | null
          home_exercises: string | null
          id: string
          notes: string | null
          objective: string | null
          pain_after: number | null
          pain_before: number | null
          patient_id: string
          plan: string | null
          professional_id: string
          session_date: string
          start_time: string | null
          subjective: string | null
          techniques: string[]
          updated_at: string
        }
        Insert: {
          assessment?: string | null
          attendance?: string
          created_at?: string
          duration_minutes?: number | null
          home_exercises?: string | null
          id?: string
          notes?: string | null
          objective?: string | null
          pain_after?: number | null
          pain_before?: number | null
          patient_id: string
          plan?: string | null
          professional_id?: string
          session_date: string
          start_time?: string | null
          subjective?: string | null
          techniques?: string[]
          updated_at?: string
        }
        Update: {
          assessment?: string | null
          attendance?: string
          created_at?: string
          duration_minutes?: number | null
          home_exercises?: string | null
          id?: string
          notes?: string | null
          objective?: string | null
          pain_after?: number | null
          pain_before?: number | null
          patient_id?: string
          plan?: string | null
          professional_id?: string
          session_date?: string
          start_time?: string | null
          subjective?: string | null
          techniques?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_sessions_patient_fk"
            columns: ["patient_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "patient_overview"
            referencedColumns: ["id", "professional_id"]
          },
          {
            foreignKeyName: "treatment_sessions_patient_fk"
            columns: ["patient_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id", "professional_id"]
          },
        ]
      }
    }
    Views: {
      patient_overview: {
        Row: {
          active_regions: number | null
          birth_date: string | null
          consultation_reason: string | null
          created_at: string | null
          document_number: string | null
          document_type: string | null
          email: string | null
          first_name: string | null
          health_insurance: string | null
          id: string | null
          kinesic_diagnosis: string | null
          last_name: string | null
          last_session_date: string | null
          max_pain: number | null
          medical_diagnosis: string | null
          phone: string | null
          professional_id: string | null
          session_count: number | null
          sex: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_pain_current: {
        Row: {
          aggravating_factors: string | null
          created_at: string | null
          frequency: string | null
          id: string | null
          intensity: number | null
          irradiation: string | null
          notes: string | null
          pain_types: string[] | null
          patient_id: string | null
          point_x: number | null
          point_y: number | null
          professional_id: string | null
          recorded_at: string | null
          region: string | null
          relieving_factors: string | null
          session_id: string | null
          started_on: string | null
          status: string | null
          view: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pain_records_patient_fk"
            columns: ["patient_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "patient_overview"
            referencedColumns: ["id", "professional_id"]
          },
          {
            foreignKeyName: "pain_records_patient_fk"
            columns: ["patient_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id", "professional_id"]
          },
          {
            foreignKeyName: "pain_records_session_fk"
            columns: ["session_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "treatment_sessions"
            referencedColumns: ["id", "professional_id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

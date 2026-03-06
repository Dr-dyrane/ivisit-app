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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulances: {
        Row: {
          base_price: number | null
          call_sign: string | null
          created_at: string
          crew: Json | null
          current_call: string | null
          display_id: string | null
          eta: string | null
          hospital_id: string | null
          id: string
          license_plate: string | null
          location: unknown
          organization_id: string | null
          profile_id: string | null
          status: string | null
          type: string | null
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          base_price?: number | null
          call_sign?: string | null
          created_at?: string
          crew?: Json | null
          current_call?: string | null
          display_id?: string | null
          eta?: string | null
          hospital_id?: string | null
          id?: string
          license_plate?: string | null
          location?: unknown
          organization_id?: string | null
          profile_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          base_price?: number | null
          call_sign?: string | null
          created_at?: string
          crew?: Json | null
          current_call?: string | null
          display_id?: string | null
          eta?: string | null
          hospital_id?: string | null
          id?: string
          license_plate?: string | null
          location?: unknown
          organization_id?: string | null
          profile_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambulances_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_schedules: {
        Row: {
          created_at: string
          date: string
          doctor_id: string
          end_time: string
          id: string
          is_available: boolean | null
          shift_type: string
          start_time: string
        }
        Insert: {
          created_at?: string
          date: string
          doctor_id: string
          end_time: string
          id?: string
          is_available?: boolean | null
          shift_type: string
          start_time: string
        }
        Update: {
          created_at?: string
          date?: string
          doctor_id?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          shift_type?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_schedules_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          about: string | null
          consultation_fee: string | null
          created_at: string
          current_patients: number | null
          department: string | null
          display_id: string | null
          email: string | null
          experience: number | null
          hospital_id: string | null
          id: string
          image: string | null
          is_available: boolean | null
          is_on_call: boolean | null
          license_number: string | null
          max_patients: number | null
          name: string
          phone: string | null
          profile_id: string | null
          rating: number | null
          reviews_count: number | null
          specialization: string
          status: string | null
          updated_at: string
        }
        Insert: {
          about?: string | null
          consultation_fee?: string | null
          created_at?: string
          current_patients?: number | null
          department?: string | null
          display_id?: string | null
          email?: string | null
          experience?: number | null
          hospital_id?: string | null
          id?: string
          image?: string | null
          is_available?: boolean | null
          is_on_call?: boolean | null
          license_number?: string | null
          max_patients?: number | null
          name: string
          phone?: string | null
          profile_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          specialization: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          about?: string | null
          consultation_fee?: string | null
          created_at?: string
          current_patients?: number | null
          department?: string | null
          display_id?: string | null
          email?: string | null
          experience?: number | null
          hospital_id?: string | null
          id?: string
          image?: string | null
          is_available?: boolean | null
          is_on_call?: boolean | null
          license_number?: string | null
          max_patients?: number | null
          name?: string
          phone?: string | null
          profile_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          specialization?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          slug: string
          tier: string | null
          title: string
          updated_at: string
          visibility: string[] | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          slug: string
          tier?: string | null
          title: string
          updated_at?: string
          visibility?: string[] | null
        }
        Update: {
          content?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          slug?: string
          tier?: string | null
          title?: string
          updated_at?: string
          visibility?: string[] | null
        }
        Relationships: []
      }
      emergency_doctor_assignments: {
        Row: {
          assigned_at: string | null
          created_at: string
          doctor_id: string
          emergency_request_id: string
          id: string
          notes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string
          doctor_id: string
          emergency_request_id: string
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string
          doctor_id?: string
          emergency_request_id?: string
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eda_emergency_request_fk"
            columns: ["emergency_request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_doctor_assignments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_requests: {
        Row: {
          ambulance_id: string | null
          ambulance_type: string | null
          assigned_doctor_id: string | null
          bed_number: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          destination_location: unknown
          display_id: string | null
          doctor_assigned_at: string | null
          hospital_id: string | null
          hospital_name: string | null
          id: string
          patient_location: unknown
          patient_snapshot: Json | null
          payment_status: string | null
          pickup_location: unknown
          responder_heading: number | null
          responder_id: string | null
          responder_location: unknown
          responder_name: string | null
          responder_phone: string | null
          responder_vehicle_plate: string | null
          responder_vehicle_type: string | null
          service_type: string
          specialty: string | null
          status: string
          total_cost: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ambulance_id?: string | null
          ambulance_type?: string | null
          assigned_doctor_id?: string | null
          bed_number?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          destination_location?: unknown
          display_id?: string | null
          doctor_assigned_at?: string | null
          hospital_id?: string | null
          hospital_name?: string | null
          id?: string
          patient_location?: unknown
          patient_snapshot?: Json | null
          payment_status?: string | null
          pickup_location?: unknown
          responder_heading?: number | null
          responder_id?: string | null
          responder_location?: unknown
          responder_name?: string | null
          responder_phone?: string | null
          responder_vehicle_plate?: string | null
          responder_vehicle_type?: string | null
          service_type: string
          specialty?: string | null
          status?: string
          total_cost?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ambulance_id?: string | null
          ambulance_type?: string | null
          assigned_doctor_id?: string | null
          bed_number?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          destination_location?: unknown
          display_id?: string | null
          doctor_assigned_at?: string | null
          hospital_id?: string | null
          hospital_name?: string | null
          id?: string
          patient_location?: unknown
          patient_snapshot?: Json | null
          payment_status?: string | null
          pickup_location?: unknown
          responder_heading?: number | null
          responder_id?: string | null
          responder_location?: unknown
          responder_name?: string | null
          responder_phone?: string | null
          responder_vehicle_plate?: string | null
          responder_vehicle_type?: string | null
          service_type?: string
          specialty?: string | null
          status?: string
          total_cost?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_requests_ambulance_id_fkey"
            columns: ["ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_assigned_doctor_id_fkey"
            columns: ["assigned_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_status_transitions: {
        Row: {
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          emergency_request_id: string
          from_status: string | null
          id: string
          occurred_at: string
          reason: string
          request_snapshot: Json
          source: string
          to_status: string
          transition_metadata: Json
        }
        Insert: {
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          emergency_request_id: string
          from_status?: string | null
          id?: string
          occurred_at?: string
          reason?: string
          request_snapshot?: Json
          source?: string
          to_status: string
          transition_metadata?: Json
        }
        Update: {
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          emergency_request_id?: string
          from_status?: string | null
          id?: string
          occurred_at?: string
          reason?: string
          request_snapshot?: Json
          source?: string
          to_status?: string
          transition_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "emergency_status_transitions_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_status_transitions_emergency_request_id_fkey"
            columns: ["emergency_request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      health_news: {
        Row: {
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          published: boolean | null
          source: string
          title: string
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          published?: boolean | null
          source: string
          title: string
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          published?: boolean | null
          source?: string
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      hospitals: {
        Row: {
          address: string
          ambulance_availability: Json | null
          ambulances_count: number | null
          available_beds: number | null
          base_price: number | null
          bed_availability: Json | null
          created_at: string
          display_id: string | null
          emergency_level: string | null
          emergency_wait_time_minutes: number | null
          features: string[] | null
          id: string
          image: string | null
          last_availability_update: string | null
          latitude: number | null
          longitude: number | null
          name: string
          org_admin_id: string | null
          organization_id: string | null
          phone: string | null
          place_id: string | null
          price_range: string | null
          rating: number | null
          service_types: string[] | null
          specialties: string[] | null
          status: string | null
          type: string | null
          updated_at: string
          verification_status: string | null
          verified: boolean | null
          wait_time: string | null
        }
        Insert: {
          address: string
          ambulance_availability?: Json | null
          ambulances_count?: number | null
          available_beds?: number | null
          base_price?: number | null
          bed_availability?: Json | null
          created_at?: string
          display_id?: string | null
          emergency_level?: string | null
          emergency_wait_time_minutes?: number | null
          features?: string[] | null
          id?: string
          image?: string | null
          last_availability_update?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          org_admin_id?: string | null
          organization_id?: string | null
          phone?: string | null
          place_id?: string | null
          price_range?: string | null
          rating?: number | null
          service_types?: string[] | null
          specialties?: string[] | null
          status?: string | null
          type?: string | null
          updated_at?: string
          verification_status?: string | null
          verified?: boolean | null
          wait_time?: string | null
        }
        Update: {
          address?: string
          ambulance_availability?: Json | null
          ambulances_count?: number | null
          available_beds?: number | null
          base_price?: number | null
          bed_availability?: Json | null
          created_at?: string
          display_id?: string | null
          emergency_level?: string | null
          emergency_wait_time_minutes?: number | null
          features?: string[] | null
          id?: string
          image?: string | null
          last_availability_update?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          org_admin_id?: string | null
          organization_id?: string | null
          phone?: string | null
          place_id?: string | null
          price_range?: string | null
          rating?: number | null
          service_types?: string[] | null
          specialties?: string[] | null
          status?: string | null
          type?: string | null
          updated_at?: string
          verification_status?: string | null
          verified?: boolean | null
          wait_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospitals_org_admin_id_fkey"
            columns: ["org_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      id_mappings: {
        Row: {
          created_at: string
          display_id: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          created_at?: string
          display_id: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          created_at?: string
          display_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      insurance_billing: {
        Row: {
          billing_date: string | null
          claim_number: string | null
          coverage_percentage: number | null
          created_at: string
          emergency_request_id: string | null
          hospital_id: string | null
          id: string
          insurance_amount: number
          insurance_policy_id: string | null
          paid_date: string | null
          status: string | null
          total_amount: number
          updated_at: string
          user_amount: number
          user_id: string | null
        }
        Insert: {
          billing_date?: string | null
          claim_number?: string | null
          coverage_percentage?: number | null
          created_at?: string
          emergency_request_id?: string | null
          hospital_id?: string | null
          id?: string
          insurance_amount: number
          insurance_policy_id?: string | null
          paid_date?: string | null
          status?: string | null
          total_amount: number
          updated_at?: string
          user_amount: number
          user_id?: string | null
        }
        Update: {
          billing_date?: string | null
          claim_number?: string | null
          coverage_percentage?: number | null
          created_at?: string
          emergency_request_id?: string | null
          hospital_id?: string | null
          id?: string
          insurance_amount?: number
          insurance_policy_id?: string | null
          paid_date?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string
          user_amount?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_billing_emergency_request_id_fkey"
            columns: ["emergency_request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_billing_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_billing_insurance_policy_id_fkey"
            columns: ["insurance_policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_billing_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policies: {
        Row: {
          coverage_details: Json | null
          coverage_percentage: number | null
          created_at: string
          expires_at: string | null
          id: string
          is_default: boolean | null
          linked_payment_method: string | null
          plan_type: string | null
          policy_number: string | null
          provider_name: string
          starts_at: string | null
          status: string | null
          updated_at: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          coverage_details?: Json | null
          coverage_percentage?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_default?: boolean | null
          linked_payment_method?: string | null
          plan_type?: string | null
          policy_number?: string | null
          provider_name: string
          starts_at?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          coverage_details?: Json | null
          coverage_percentage?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_default?: boolean | null
          linked_payment_method?: string | null
          plan_type?: string | null
          policy_number?: string | null
          provider_name?: string
          starts_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ivisit_main_wallet: {
        Row: {
          balance: number | null
          currency: string | null
          id: string
          last_updated: string | null
        }
        Insert: {
          balance?: number | null
          currency?: string | null
          id?: string
          last_updated?: string | null
        }
        Update: {
          balance?: number | null
          currency?: string | null
          id?: string
          last_updated?: string | null
        }
        Relationships: []
      }
      medical_profiles: {
        Row: {
          allergies: string[] | null
          blood_type: string | null
          conditions: string[] | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          emergency_notes: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          medications: string[] | null
          organ_donor: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[] | null
          blood_type?: string | null
          conditions?: string[] | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          emergency_notes?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          medications?: string[] | null
          organ_donor?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[] | null
          blood_type?: string | null
          conditions?: string[] | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          emergency_notes?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          medications?: string[] | null
          organ_donor?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_data: Json | null
          action_type: string | null
          color: string | null
          created_at: string
          display_id: string | null
          icon: string | null
          id: string
          message: string | null
          metadata: Json | null
          priority: string | null
          read: boolean
          target_id: string | null
          timestamp: string
          title: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type?: string | null
          color?: string | null
          created_at?: string
          display_id?: string | null
          icon?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          priority?: string | null
          read?: boolean
          target_id?: string | null
          timestamp?: string
          title?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string | null
          color?: string | null
          created_at?: string
          display_id?: string | null
          icon?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          priority?: string | null
          read?: boolean
          target_id?: string | null
          timestamp?: string
          title?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_wallets: {
        Row: {
          balance: number | null
          created_at: string
          currency: string | null
          display_id: string | null
          id: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          currency?: string | null
          display_id?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          currency?: string | null
          display_id?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_wallets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          contact_email: string | null
          created_at: string
          display_id: string | null
          fee_tier: string | null
          id: string
          is_active: boolean | null
          ivisit_fee_percentage: number | null
          name: string
          stripe_account_id: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          display_id?: string | null
          fee_tier?: string | null
          id?: string
          is_active?: boolean | null
          ivisit_fee_percentage?: number | null
          name: string
          stripe_account_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          display_id?: string | null
          fee_tier?: string | null
          id?: string
          is_active?: boolean | null
          ivisit_fee_percentage?: number | null
          name?: string
          stripe_account_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_wallets: {
        Row: {
          balance: number | null
          created_at: string
          currency: string | null
          display_id: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string
          currency?: string | null
          display_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string
          currency?: string | null
          display_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string
          expiry_month: number | null
          expiry_year: number | null
          id: string
          is_default: boolean | null
          is_active: boolean | null
          last4: string | null
          metadata: Json | null
          organization_id: string | null
          provider: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_default?: boolean | null
          is_active?: boolean | null
          last4?: string | null
          metadata?: Json | null
          organization_id?: string | null
          provider: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_default?: boolean | null
          is_active?: boolean | null
          last4?: string | null
          metadata?: Json | null
          organization_id?: string | null
          provider?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          display_id: string | null
          emergency_request_id: string | null
          id: string
          ivisit_fee_amount: number | null
          metadata: Json | null
          organization_id: string | null
          payment_method: string | null
          processed_at: string | null
          provider_response: Json | null
          status: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          display_id?: string | null
          emergency_request_id?: string | null
          id?: string
          ivisit_fee_amount?: number | null
          metadata?: Json | null
          organization_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          provider_response?: Json | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          display_id?: string | null
          emergency_request_id?: string | null
          id?: string
          ivisit_fee_amount?: number | null
          metadata?: Json | null
          organization_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          provider_response?: Json | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_emergency_request_id_fkey"
            columns: ["emergency_request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          appointment_reminders: boolean
          created_at: string
          demo_mode_enabled: boolean
          emergency_updates: boolean
          notification_sounds_enabled: boolean
          notifications_enabled: boolean
          privacy_share_emergency_contacts: boolean
          privacy_share_medical_profile: boolean
          updated_at: string
          user_id: string
          view_preferences: Json | null
        }
        Insert: {
          appointment_reminders?: boolean
          created_at?: string
          demo_mode_enabled?: boolean
          emergency_updates?: boolean
          notification_sounds_enabled?: boolean
          notifications_enabled?: boolean
          privacy_share_emergency_contacts?: boolean
          privacy_share_medical_profile?: boolean
          updated_at?: string
          user_id: string
          view_preferences?: Json | null
        }
        Update: {
          appointment_reminders?: boolean
          created_at?: string
          demo_mode_enabled?: boolean
          emergency_updates?: boolean
          notification_sounds_enabled?: boolean
          notifications_enabled?: boolean
          privacy_share_emergency_contacts?: boolean
          privacy_share_medical_profile?: boolean
          updated_at?: string
          user_id?: string
          view_preferences?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          assigned_ambulance_id: string | null
          avatar_url: string | null
          bvn_verified: boolean | null
          created_at: string
          date_of_birth: string | null
          display_id: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          image_uri: string | null
          ivisit_fee_percentage: number | null
          last_name: string | null
          onboarding_status: string | null
          organization_id: string | null
          organization_name: string | null
          payout_method_brand: string | null
          payout_method_id: string | null
          payout_method_last4: string | null
          phone: string | null
          provider_type: string | null
          role: string | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          address?: string | null
          assigned_ambulance_id?: string | null
          avatar_url?: string | null
          bvn_verified?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          display_id?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          image_uri?: string | null
          ivisit_fee_percentage?: number | null
          last_name?: string | null
          onboarding_status?: string | null
          organization_id?: string | null
          organization_name?: string | null
          payout_method_brand?: string | null
          payout_method_id?: string | null
          payout_method_last4?: string | null
          phone?: string | null
          provider_type?: string | null
          role?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          address?: string | null
          assigned_ambulance_id?: string | null
          avatar_url?: string | null
          bvn_verified?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          display_id?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          image_uri?: string | null
          ivisit_fee_percentage?: number | null
          last_name?: string | null
          onboarding_status?: string | null
          organization_id?: string | null
          organization_name?: string | null
          payout_method_brand?: string | null
          payout_method_id?: string | null
          payout_method_last4?: string | null
          phone?: string | null
          provider_type?: string | null
          role?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      room_pricing: {
        Row: {
          created_at: string | null
          description: string | null
          hospital_id: string | null
          id: string
          price_per_night: number
          room_name: string
          room_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          price_per_night?: number
          room_name: string
          room_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          price_per_night?: number
          room_name?: string
          room_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_pricing_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      search_events: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          query: string | null
          selected_key: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          query?: string | null
          selected_key?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          query?: string | null
          selected_key?: string | null
          source?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          query: string
          result_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          result_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          result_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_selections: {
        Row: {
          created_at: string
          id: string
          query: string
          result_id: string
          result_type: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          result_id: string
          result_type: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          result_id?: string
          result_type?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_selections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_pricing: {
        Row: {
          base_price: number
          created_at: string | null
          description: string | null
          hospital_id: string | null
          id: string
          service_name: string
          service_type: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number
          created_at?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          service_name: string
          service_type: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          service_name?: string
          service_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_pricing_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          new_user: boolean | null
          status: string | null
          subscription_date: string | null
          type: string | null
          updated_at: string
          welcome_email_sent: boolean | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          new_user?: boolean | null
          status?: string | null
          subscription_date?: string | null
          type?: string | null
          updated_at?: string
          welcome_email_sent?: boolean | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          new_user?: boolean | null
          status?: string | null
          subscription_date?: string | null
          type?: string | null
          updated_at?: string
          welcome_email_sent?: boolean | null
        }
        Relationships: []
      }
      support_faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          question: string
          rank: number | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          question: string
          rank?: number | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          question?: string
          rank?: number | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          id: string
          message: string
          organization_id: string | null
          priority: string | null
          status: string | null
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          message: string
          organization_id?: string | null
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          message?: string
          organization_id?: string | null
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_topics: {
        Row: {
          category: string
          created_at: string
          id: string
          query: string
          rank: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          query: string
          rank: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          query?: string
          rank?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          action: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          id: string
          last_active: string | null
          session_data: Json | null
          user_id: string | null
        }
        Insert: {
          id?: string
          last_active?: string | null
          session_data?: Json | null
          user_id?: string | null
        }
        Update: {
          id?: string
          last_active?: string | null
          session_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          cost: string | null
          created_at: string
          date: string | null
          display_id: string | null
          doctor_name: string | null
          hospital_id: string | null
          hospital_name: string | null
          id: string
          lifecycle_state: string | null
          lifecycle_updated_at: string | null
          notes: string | null
          rated_at: string | null
          rating: number | null
          rating_comment: string | null
          request_id: string | null
          specialty: string | null
          status: string | null
          time: string | null
          type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cost?: string | null
          created_at?: string
          date?: string | null
          display_id?: string | null
          doctor_name?: string | null
          hospital_id?: string | null
          hospital_name?: string | null
          id?: string
          lifecycle_state?: string | null
          lifecycle_updated_at?: string | null
          notes?: string | null
          rated_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          request_id?: string | null
          specialty?: string | null
          status?: string | null
          time?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cost?: string | null
          created_at?: string
          date?: string | null
          display_id?: string | null
          doctor_name?: string | null
          hospital_id?: string | null
          hospital_name?: string | null
          id?: string
          lifecycle_state?: string | null
          lifecycle_updated_at?: string | null
          notes?: string | null
          rated_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          request_id?: string | null
          specialty?: string | null
          status?: string | null
          time?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_ledger: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          external_reference: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          transaction_type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          external_reference?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          transaction_type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          external_reference?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          transaction_type?: string
          wallet_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_update_trending_topics: { Args: { payload: Json }; Returns: Json }
      approve_cash_payment: {
        Args: { p_payment_id: string; p_request_id: string }
        Returns: Json
      }
      assign_doctor_to_emergency: {
        Args: {
          p_doctor_id: string
          p_emergency_request_id: string
          p_notes?: string
        }
        Returns: Json
      }
      calculate_emergency_cost_v2: {
        Args: {
          p_ambulance_type?: string
          p_distance_km?: number
          p_hospital_id?: string
          p_service_type: string
        }
        Returns: Json
      }
      cancel_bed_reservation: {
        Args: { request_uuid: string }
        Returns: boolean
      }
      cancel_trip: { Args: { request_uuid: string }; Returns: boolean }
      check_cash_eligibility: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      complete_trip: { Args: { request_uuid: string }; Returns: boolean }
      create_emergency_v4: {
        Args: { p_payment_data?: Json; p_request_data: Json; p_user_id: string }
        Returns: Json
      }
      current_user_is_admin: { Args: never; Returns: boolean }
      current_user_permission_level: { Args: never; Returns: string }
      decline_cash_payment: {
        Args: { p_payment_id: string; p_request_id: string }
        Returns: Json
      }
      delete_room_pricing: { Args: { target_id: string }; Returns: Json }
      delete_service_pricing: { Args: { target_id: string }; Returns: Json }
      delete_user: { Args: never; Returns: Json }
      delete_user_by_admin: { Args: { target_user_id: string }; Returns: Json }
      disablelongtransactions: { Args: never; Returns: string }
      discharge_patient: { Args: { request_uuid: string }; Returns: boolean }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      generate_display_id: { Args: { prefix: string }; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_activity_stats: { Args: { days_back?: number }; Returns: Json }
      get_all_auth_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          phone: string
          raw_user_meta_data: Json
        }[]
      }
      get_available_doctors: {
        Args: { p_hospital_id: string; p_specialty?: string }
        Returns: {
          availability_status: string
          current_patients: number
          doctor_id: string
          doctor_name: string
          max_patients: number
          specialty: string
        }[]
      }
      get_entity_id: { Args: { p_display_id: string }; Returns: string }
      get_org_stripe_status: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_recent_activity: {
        Args: { limit_count?: number; offset_count?: number }
        Returns: {
          action: string
          created_at: string
          description: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          user_id: string
        }[]
      }
      get_room_price: {
        Args: { p_hospital_id?: string; p_room_type: string }
        Returns: {
          currency: string
          price: number
          room_name: string
        }[]
      }
      get_search_analytics: {
        Args: { p_days?: number }
        Returns: {
          avg_results: number
          total_searches: number
          unique_queries: number
        }[]
      }
      get_search_analytics_summary: { Args: { p_days?: number }; Returns: Json }
      get_service_price: {
        Args: { p_hospital_id?: string; p_service_type: string }
        Returns: {
          currency: string
          price: number
          service_name: string
        }[]
      }
      get_trending_searches: {
        Args: { p_limit?: number }
        Returns: {
          category: string
          id: string
          query: string
          rank: number
        }[]
      }
      get_user_statistics: {
        Args: never
        Returns: {
          active_emergencies: number
          total_hospitals: number
          total_users: number
          verified_users: number
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      log_user_activity: {
        Args: {
          p_action: string
          p_description?: string
          p_entity_id?: string
          p_entity_type?: string
          p_metadata?: Json
        }
        Returns: Json
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      nearby_ambulances: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          call_sign: string
          display_id: string
          distance: number
          id: string
          latitude: number
          longitude: number
          status: string
        }[]
      }
      nearby_hospitals: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          address: string
          display_id: string
          distance: number
          id: string
          latitude: number
          longitude: number
          name: string
          status: string
          verified: boolean
        }[]
      }
      p_get_current_org_id: { Args: never; Returns: string }
      p_is_admin: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      process_cash_payment: {
        Args: {
          p_amount: number
          p_emergency_request_id: string
          p_organization_id: string
        }
        Returns: Json
      }
      process_cash_payment_v2: {
        Args: {
          p_amount: number
          p_currency?: string
          p_emergency_request_id: string
          p_organization_id: string
        }
        Returns: Json
      }
      process_wallet_payment: {
        Args: {
          p_amount: number
          p_emergency_request_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      rate_visit: {
        Args: { p_comment?: string; p_rating: number; p_visit_id: string }
        Returns: Json
      }
      reload_schema: { Args: never; Returns: undefined }
      search_auth_users: {
        Args: { search_term: string }
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          phone: string
          raw_user_meta_data: Json
        }[]
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_hospital_availability: {
        Args: {
          ambulance_count: number
          beds_available: number
          er_wait_time: number
          hospital_id: string
          p_status: string
        }
        Returns: boolean
      }
      update_hospital_by_admin: {
        Args: { payload: Json; target_hospital_id: string }
        Returns: Json
      }
      update_profile_by_admin: {
        Args: { payload: Json; target_user_id: string }
        Returns: Json
      }
      update_trending_topics_from_search: { Args: never; Returns: Json }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_room_pricing: { Args: { payload: Json }; Returns: Json }
      upsert_service_pricing: { Args: { payload: Json }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
    Enums: {},
  },
} as const

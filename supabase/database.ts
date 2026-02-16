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
      access_requests: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          nda_signed_at: string | null
          signer_entity: string | null
          signer_name: string | null
          signer_title: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          nda_signed_at?: string | null
          signer_entity?: string | null
          signer_name?: string | null
          signer_title?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          nda_signed_at?: string | null
          signer_entity?: string | null
          signer_name?: string | null
          signer_title?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ambulances: {
        Row: {
          base_price: number | null
          call_sign: string | null
          created_at: string | null
          crew: string[] | null
          currency: string | null
          current_call: Json | null
          driver_id: string | null
          eta: string | null
          hospital: string | null
          hospital_id: string | null
          id: string
          last_maintenance: string | null
          location: unknown
          organization_id: string | null
          profile_id: string | null
          rating: number | null
          status: string | null
          type: string | null
          updated_at: string | null
          vehicle_number: string | null
        }
        Insert: {
          base_price?: number | null
          call_sign?: string | null
          created_at?: string | null
          crew?: string[] | null
          currency?: string | null
          current_call?: Json | null
          driver_id?: string | null
          eta?: string | null
          hospital?: string | null
          hospital_id?: string | null
          id: string
          last_maintenance?: string | null
          location?: unknown
          organization_id?: string | null
          profile_id?: string | null
          rating?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle_number?: string | null
        }
        Update: {
          base_price?: number | null
          call_sign?: string | null
          created_at?: string | null
          crew?: string[] | null
          currency?: string | null
          current_call?: Json | null
          driver_id?: string | null
          eta?: string | null
          hospital?: string | null
          hospital_id?: string | null
          id?: string
          last_maintenance?: string | null
          location?: unknown
          organization_id?: string | null
          profile_id?: string | null
          rating?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambulances_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "available_hospitals"
            referencedColumns: ["id"]
          },
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
        ]
      }
      doctors: {
        Row: {
          about: string | null
          consultation_fee: string | null
          created_at: string | null
          email: string | null
          experience: number | null
          hospital_id: string | null
          id: string
          image: string | null
          is_available: boolean | null
          license_number: string | null
          name: string
          phone: string | null
          profile_id: string | null
          rating: number | null
          reviews_count: number | null
          specialization: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          about?: string | null
          consultation_fee?: string | null
          created_at?: string | null
          email?: string | null
          experience?: number | null
          hospital_id?: string | null
          id?: string
          image?: string | null
          is_available?: boolean | null
          license_number?: string | null
          name: string
          phone?: string | null
          profile_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          specialization: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          about?: string | null
          consultation_fee?: string | null
          created_at?: string | null
          email?: string | null
          experience?: number | null
          hospital_id?: string | null
          id?: string
          image?: string | null
          is_available?: boolean | null
          license_number?: string | null
          name?: string
          phone?: string | null
          profile_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          specialization?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "available_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      document_invites: {
        Row: {
          claimed: boolean | null
          claimed_by: string | null
          created_at: string | null
          document_id: string
          email: string
          expires_at: string | null
          id: string
          token: string
        }
        Insert: {
          claimed?: boolean | null
          claimed_by?: string | null
          created_at?: string | null
          document_id: string
          email: string
          expires_at?: string | null
          id?: string
          token?: string
        }
        Update: {
          claimed?: boolean | null
          claimed_by?: string | null
          created_at?: string | null
          document_id?: string
          email?: string
          expires_at?: string | null
          id?: string
          token?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          created_at: string | null
          description: string | null
          file_path: string
          icon: string | null
          id: string
          slug: string
          tier: string | null
          title: string
          updated_at: string | null
          visibility: string[] | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          file_path: string
          icon?: string | null
          id?: string
          slug: string
          tier?: string | null
          title: string
          updated_at?: string | null
          visibility?: string[] | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string
          icon?: string | null
          id?: string
          slug?: string
          tier?: string | null
          title?: string
          updated_at?: string | null
          visibility?: string[] | null
        }
        Relationships: []
      }
      emergency_requests: {
        Row: {
          ambulance_id: string | null
          ambulance_type: string | null
          base_cost: number | null
          bed_count: string | null
          bed_number: string | null
          bed_type: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_cost: number | null
          cost_breakdown: Json | null
          created_at: string
          destination_location: unknown
          distance_surcharge: number | null
          estimated_arrival: string | null
          hospital_id: string | null
          hospital_name: string | null
          id: string
          patient_heading: number | null
          patient_location: unknown
          patient_snapshot: Json | null
          payment_id: string | null
          payment_method_id: string | null
          payment_status: string | null
          pickup_location: unknown
          request_id: string | null
          responder_heading: number | null
          responder_id: string | null
          responder_location: unknown
          responder_name: string | null
          responder_phone: string | null
          responder_vehicle_plate: string | null
          responder_vehicle_type: string | null
          service_type: string
          shared_data_snapshot: Json | null
          specialty: string | null
          status: string
          total_cost: number | null
          updated_at: string
          urgency_surcharge: number | null
          user_id: string | null
        }
        Insert: {
          ambulance_id?: string | null
          ambulance_type?: string | null
          base_cost?: number | null
          bed_count?: string | null
          bed_number?: string | null
          bed_type?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_cost?: number | null
          cost_breakdown?: Json | null
          created_at?: string
          destination_location?: unknown
          distance_surcharge?: number | null
          estimated_arrival?: string | null
          hospital_id?: string | null
          hospital_name?: string | null
          id: string
          patient_heading?: number | null
          patient_location?: unknown
          patient_snapshot?: Json | null
          payment_id?: string | null
          payment_method_id?: string | null
          payment_status?: string | null
          pickup_location?: unknown
          request_id?: string | null
          responder_heading?: number | null
          responder_id?: string | null
          responder_location?: unknown
          responder_name?: string | null
          responder_phone?: string | null
          responder_vehicle_plate?: string | null
          responder_vehicle_type?: string | null
          service_type: string
          shared_data_snapshot?: Json | null
          specialty?: string | null
          status?: string
          total_cost?: number | null
          updated_at?: string
          urgency_surcharge?: number | null
          user_id?: string | null
        }
        Update: {
          ambulance_id?: string | null
          ambulance_type?: string | null
          base_cost?: number | null
          bed_count?: string | null
          bed_number?: string | null
          bed_type?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_cost?: number | null
          cost_breakdown?: Json | null
          created_at?: string
          destination_location?: unknown
          distance_surcharge?: number | null
          estimated_arrival?: string | null
          hospital_id?: string | null
          hospital_name?: string | null
          id?: string
          patient_heading?: number | null
          patient_location?: unknown
          patient_snapshot?: Json | null
          payment_id?: string | null
          payment_method_id?: string | null
          payment_status?: string | null
          pickup_location?: unknown
          request_id?: string | null
          responder_heading?: number | null
          responder_id?: string | null
          responder_location?: unknown
          responder_name?: string | null
          responder_phone?: string | null
          responder_vehicle_plate?: string | null
          responder_vehicle_type?: string | null
          service_type?: string
          shared_data_snapshot?: Json | null
          specialty?: string | null
          status?: string
          total_cost?: number | null
          updated_at?: string
          urgency_surcharge?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      health_news: {
        Row: {
          category: string | null
          created_at: string | null
          icon: string
          id: string
          published: boolean | null
          source: string
          time: string
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          icon: string
          id?: string
          published?: boolean | null
          source: string
          time: string
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          icon?: string
          id?: string
          published?: boolean | null
          source?: string
          time?: string
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      hospital_import_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_count: number | null
          errors: Json | null
          id: string
          import_type: string
          imported_count: number | null
          location_lat: number | null
          location_lng: number | null
          radius_km: number | null
          search_query: string | null
          skipped_count: number | null
          status: string | null
          total_found: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          errors?: Json | null
          id?: string
          import_type: string
          imported_count?: number | null
          location_lat?: number | null
          location_lng?: number | null
          radius_km?: number | null
          search_query?: string | null
          skipped_count?: number | null
          status?: string | null
          total_found?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          errors?: Json | null
          id?: string
          import_type?: string
          imported_count?: number | null
          location_lat?: number | null
          location_lng?: number | null
          radius_km?: number | null
          search_query?: string | null
          skipped_count?: number | null
          status?: string | null
          total_found?: number | null
        }
        Relationships: []
      }
      hospital_rooms: {
        Row: {
          base_price: number | null
          created_at: string | null
          currency: string | null
          features: string[] | null
          hospital_id: string | null
          id: string
          room_number: string
          room_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string | null
          currency?: string | null
          features?: string[] | null
          hospital_id?: string | null
          id?: string
          room_number: string
          room_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          created_at?: string | null
          currency?: string | null
          features?: string[] | null
          hospital_id?: string | null
          id?: string
          room_number?: string
          room_type?: string
          status?: string | null
          updated_at?: string | null
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
          created_at: string | null
          display_id: string | null
          emergency_level: string | null
          emergency_wait_time_minutes: number | null
          features: string[] | null
          google_address: string | null
          google_opening_hours: Json | null
          google_phone: string | null
          google_photos: string[] | null
          google_rating: number | null
          google_types: string[] | null
          google_website: string | null
          id: string
          image: string | null
          import_status: string | null
          imported_from_google: boolean | null
          last_availability_update: string | null
          last_google_sync: string | null
          latitude: number | null
          longitude: number | null
          name: string
          org_admin_id: string | null
          organization_id: string | null
          phone: string | null
          place_id: string | null
          price_range: string | null
          rating: number | null
          real_time_sync: boolean | null
          service_types: string[] | null
          specialties: string[] | null
          status: string | null
          type: string | null
          updated_at: string | null
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
          created_at?: string | null
          display_id?: string | null
          emergency_level?: string | null
          emergency_wait_time_minutes?: number | null
          features?: string[] | null
          google_address?: string | null
          google_opening_hours?: Json | null
          google_phone?: string | null
          google_photos?: string[] | null
          google_rating?: number | null
          google_types?: string[] | null
          google_website?: string | null
          id?: string
          image?: string | null
          import_status?: string | null
          imported_from_google?: boolean | null
          last_availability_update?: string | null
          last_google_sync?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          org_admin_id?: string | null
          organization_id?: string | null
          phone?: string | null
          place_id?: string | null
          price_range?: string | null
          rating?: number | null
          real_time_sync?: boolean | null
          service_types?: string[] | null
          specialties?: string[] | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
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
          created_at?: string | null
          display_id?: string | null
          emergency_level?: string | null
          emergency_wait_time_minutes?: number | null
          features?: string[] | null
          google_address?: string | null
          google_opening_hours?: Json | null
          google_phone?: string | null
          google_photos?: string[] | null
          google_rating?: number | null
          google_types?: string[] | null
          google_website?: string | null
          id?: string
          image?: string | null
          import_status?: string | null
          imported_from_google?: boolean | null
          last_availability_update?: string | null
          last_google_sync?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          org_admin_id?: string | null
          organization_id?: string | null
          phone?: string | null
          place_id?: string | null
          price_range?: string | null
          rating?: number | null
          real_time_sync?: boolean | null
          service_types?: string[] | null
          specialties?: string[] | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified?: boolean | null
          wait_time?: string | null
        }
        Relationships: [
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
          created_at: string | null
          display_id: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          created_at?: string | null
          display_id: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          created_at?: string | null
          display_id?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      insurance_policies: {
        Row: {
          back_image_url: string | null
          coverage_details: Json | null
          coverage_type: string | null
          created_at: string
          end_date: string | null
          expires_at: string | null
          front_image_url: string | null
          group_number: string | null
          id: string
          is_default: boolean | null
          linked_payment_method: Json | null
          plan_type: string | null
          policy_holder_name: string | null
          policy_number: string | null
          provider_name: string
          start_date: string | null
          starts_at: string | null
          updated_at: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          back_image_url?: string | null
          coverage_details?: Json | null
          coverage_type?: string | null
          created_at?: string
          end_date?: string | null
          expires_at?: string | null
          front_image_url?: string | null
          group_number?: string | null
          id?: string
          is_default?: boolean | null
          linked_payment_method?: Json | null
          plan_type?: string | null
          policy_holder_name?: string | null
          policy_number?: string | null
          provider_name: string
          start_date?: string | null
          starts_at?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          back_image_url?: string | null
          coverage_details?: Json | null
          coverage_type?: string | null
          created_at?: string
          end_date?: string | null
          expires_at?: string | null
          front_image_url?: string | null
          group_number?: string | null
          id?: string
          is_default?: boolean | null
          linked_payment_method?: Json | null
          plan_type?: string | null
          policy_holder_name?: string | null
          policy_number?: string | null
          provider_name?: string
          start_date?: string | null
          starts_at?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
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
        Relationships: []
      }
      notifications: {
        Row: {
          action_data: Json | null
          action_type: string | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          message: string | null
          metadata: Json | null
          priority: string | null
          read: boolean
          target_id: string | null
          timestamp: string | null
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
          icon?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          priority?: string | null
          read?: boolean
          target_id?: string | null
          timestamp?: string | null
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
          icon?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          priority?: string | null
          read?: boolean
          target_id?: string | null
          timestamp?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string | null
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
          created_at: string | null
          fee_tier: string | null
          id: string
          is_active: boolean | null
          ivisit_fee_percentage: number | null
          name: string
          stripe_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string | null
          fee_tier?: string | null
          id?: string
          is_active?: boolean | null
          ivisit_fee_percentage?: number | null
          name: string
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string | null
          fee_tier?: string | null
          id?: string
          is_active?: boolean | null
          ivisit_fee_percentage?: number | null
          name?: string
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      patient_wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string | null
          expiry_month: number | null
          expiry_year: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last4: string | null
          metadata: Json | null
          organization_id: string | null
          provider: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last4?: string | null
          metadata?: Json | null
          organization_id?: string | null
          provider: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last4?: string | null
          metadata?: Json | null
          organization_id?: string | null
          provider?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          emergency_request_id: string | null
          id: string
          ivisit_deduction_amount: number | null
          metadata: Json | null
          organization_fee_rate: number | null
          organization_id: string | null
          payment_method_id: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          emergency_request_id?: string | null
          id?: string
          ivisit_deduction_amount?: number | null
          metadata?: Json | null
          organization_fee_rate?: number | null
          organization_id?: string | null
          payment_method_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          emergency_request_id?: string | null
          id?: string
          ivisit_deduction_amount?: number | null
          metadata?: Json | null
          organization_fee_rate?: number | null
          organization_id?: string | null
          payment_method_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          assigned_ambulance_id: string | null
          avatar_url: string | null
          bvn_verified: boolean | null
          created_at: string
          date_of_birth: string | null
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
          currency: string | null
          description: string | null
          hospital_id: string | null
          id: string
          is_active: boolean | null
          price_per_night: number
          room_name: string
          room_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean | null
          price_per_night: number
          room_name: string
          room_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean | null
          price_per_night?: number
          room_name?: string
          room_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      search_events: {
        Row: {
          created_at: string | null
          extra: Json | null
          id: string
          query: string | null
          selected_key: string | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          extra?: Json | null
          id?: string
          query?: string | null
          selected_key?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          extra?: Json | null
          id?: string
          query?: string | null
          selected_key?: string | null
          source?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string | null
          id: string
          query: string
          result_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          query: string
          result_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          query?: string
          result_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      search_selections: {
        Row: {
          created_at: string | null
          id: string
          query: string
          result_id: string
          result_type: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          query: string
          result_id: string
          result_type: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          query?: string
          result_id?: string
          result_type?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      service_pricing: {
        Row: {
          base_price: number
          created_at: string | null
          currency: string | null
          description: string | null
          hospital_id: string | null
          id: string
          is_active: boolean | null
          service_name: string
          service_type: string
          updated_at: string | null
        }
        Insert: {
          base_price: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean | null
          service_name: string
          service_type: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean | null
          service_name?: string
          service_type?: string
          updated_at?: string | null
        }
        Relationships: []
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
          created_at: string | null
          email: string
          id: string
          last_engagement_at: string | null
          new_user: boolean | null
          sale_id: string | null
          source: string | null
          status: string | null
          subscription_date: string | null
          type: string | null
          unsubscribed_at: string | null
          updated_at: string | null
          welcome_email_sent: boolean | null
          welcome_email_sent_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          last_engagement_at?: string | null
          new_user?: boolean | null
          sale_id?: string | null
          source?: string | null
          status?: string | null
          subscription_date?: string | null
          type?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          welcome_email_sent?: boolean | null
          welcome_email_sent_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          last_engagement_at?: string | null
          new_user?: boolean | null
          sale_id?: string | null
          source?: string | null
          status?: string | null
          subscription_date?: string | null
          type?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          welcome_email_sent?: boolean | null
          welcome_email_sent_at?: string | null
        }
        Relationships: []
      }
      support_faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          id: number
          question: string
          rank: number | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          id?: number
          question: string
          rank?: number | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          id?: number
          question?: string
          rank?: number | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          id: string
          message: string
          organization_id: string | null
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          message: string
          organization_id?: string | null
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          message?: string
          organization_id?: string | null
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trending_topics: {
        Row: {
          category: string
          created_at: string | null
          id: string
          query: string
          rank: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          query: string
          rank: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          query?: string
          rank?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          action: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          address: string | null
          cost: string | null
          created_at: string
          date: string | null
          doctor: string | null
          doctor_image: string | null
          estimated_duration: string | null
          hospital: string | null
          hospital_id: string | null
          id: string
          image: string | null
          insurance_covered: boolean | null
          lifecycle_state: string | null
          lifecycle_updated_at: string | null
          meeting_link: string | null
          next_visit: string | null
          notes: string | null
          phone: string | null
          preparation: string[] | null
          prescriptions: string[] | null
          rated_at: string | null
          rating: number | null
          rating_comment: string | null
          request_id: string | null
          room_number: string | null
          specialty: string | null
          status: string | null
          summary: string | null
          time: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          cost?: string | null
          created_at?: string
          date?: string | null
          doctor?: string | null
          doctor_image?: string | null
          estimated_duration?: string | null
          hospital?: string | null
          hospital_id?: string | null
          id: string
          image?: string | null
          insurance_covered?: boolean | null
          lifecycle_state?: string | null
          lifecycle_updated_at?: string | null
          meeting_link?: string | null
          next_visit?: string | null
          notes?: string | null
          phone?: string | null
          preparation?: string[] | null
          prescriptions?: string[] | null
          rated_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          request_id?: string | null
          room_number?: string | null
          specialty?: string | null
          status?: string | null
          summary?: string | null
          time?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          cost?: string | null
          created_at?: string
          date?: string | null
          doctor?: string | null
          doctor_image?: string | null
          estimated_duration?: string | null
          hospital?: string | null
          hospital_id?: string | null
          id?: string
          image?: string | null
          insurance_covered?: boolean | null
          lifecycle_state?: string | null
          lifecycle_updated_at?: string | null
          meeting_link?: string | null
          next_visit?: string | null
          notes?: string | null
          phone?: string | null
          preparation?: string[] | null
          prescriptions?: string[] | null
          rated_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          request_id?: string | null
          room_number?: string | null
          specialty?: string | null
          status?: string | null
          summary?: string | null
          time?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "available_hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
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
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
          user_id: string | null
          wallet_id: string
          wallet_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
          user_id?: string | null
          wallet_id: string
          wallet_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
          user_id?: string | null
          wallet_id?: string
          wallet_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      available_hospitals: {
        Row: {
          ambulances_count: number | null
          available_beds: number | null
          id: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          status: string | null
        }
        Insert: {
          ambulances_count?: number | null
          available_beds?: number | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          status?: string | null
        }
        Update: {
          ambulances_count?: number | null
          available_beds?: number | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          status?: string | null
        }
        Relationships: []
      }
      debug_function_overloads: {
        Row: {
          arguments: string | null
          function_name: string | null
          result_type: string | null
        }
        Relationships: []
      }
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
      trending_searches_view: {
        Row: {
          category: string | null
          query: string | null
          rank: number | null
          search_count: number | null
          unique_users: number | null
          updated_at: string | null
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
      admin_update_trending_topics: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          category: string
          query: string
          rank: number
          search_count: number
          unique_users: number
        }[]
      }
      assign_driver_to_ambulance: {
        Args: { p_ambulance_id: string; p_driver_id: string }
        Returns: Json
      }
      calculate_baseline_price: {
        Args: { p_category?: string; p_hospital_id: string; p_type: string }
        Returns: number
      }
      calculate_emergency_cost: {
        Args: {
          p_ambulance_id?: string
          p_distance?: number
          p_hospital_id?: string
          p_is_urgent?: boolean
          p_service_type: string
        }
        Returns: {
          base_cost: number
          breakdown: Json
          distance_surcharge: number
          total_cost: number
          urgency_surcharge: number
        }[]
      }
      calculate_organization_ivisit_fee: {
        Args: { p_amount: number; p_organization_id: string }
        Returns: number
      }
      cancel_bed_reservation: {
        Args: { request_uuid: string }
        Returns: boolean
      }
      cancel_trip: { Args: { request_uuid: string }; Returns: boolean }
      check_cash_eligibility: {
        Args: { p_estimated_amount: number; p_organization_id: string }
        Returns: boolean
      }
      complete_trip: { Args: { request_uuid: string }; Returns: boolean }
      confirm_cash_payment: { Args: { p_payment_id: string }; Returns: Json }
      current_user_is_admin: { Args: never; Returns: boolean }
      delete_user: { Args: never; Returns: undefined }
      delete_user_by_admin: { Args: { target_user_id: string }; Returns: undefined }
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
      enroll_basic_insurance: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      generate_display_id: { Args: { prefix: string }; Returns: string }
      generate_username_from_email: {
        Args: { email_input: string }
        Returns: string
      }
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
      get_all_auth_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          phone: string
        }[]
      }
      get_current_user_onboarding_status: { Args: never; Returns: string }
      get_current_user_org_id: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_display_id:
        | {
            Args: { p_entity_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_display_id(p_entity_id => text), public.get_display_id(p_entity_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_entity_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_display_id(p_entity_id => text), public.get_display_id(p_entity_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      get_display_ids:
        | {
            Args: { p_entity_ids: string[] }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_display_ids(p_entity_ids => _text), public.get_display_ids(p_entity_ids => _uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
        | {
            Args: { p_entity_ids: string[] }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_display_ids(p_entity_ids => _text), public.get_display_ids(p_entity_ids => _uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
      get_entity_id: { Args: { p_display_id: string }; Returns: string }
      get_org_stripe_status: { Args: { p_org_id: string }; Returns: Json }
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
          time_ago: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_room_price: {
        Args: { hospital_id_param?: string; room_type_param: string }
        Returns: {
          currency: string
          price: number
          room_name: string
        }[]
      }
      get_search_analytics: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          last_searched: string
          query: string
          rank: number
          search_count: number
          unique_users: number
        }[]
      }
      get_search_analytics_summary: {
        Args: { days_back?: number }
        Returns: {
          avg_searches_per_user: number
          top_query: string
          total_searches: number
          unique_queries: number
          unique_searchers: number
        }[]
      }
      get_service_price: {
        Args: { hospital_id_param?: string; service_type_param: string }
        Returns: {
          currency: string
          price: number
          service_name: string
        }[]
      }
      get_trending_searches: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          count: number
          query: string
        }[]
      }
      get_user_statistics: {
        Args: never
        Returns: {
          admin_count: number
          email_verified_users: number
          patient_count: number
          phone_verified_users: number
          provider_count: number
          recent_signups: number
          sponsor_count: number
          total_profiles: number
          total_users: number
          viewer_count: number
        }[]
      }
      get_wallet_projection: {
        Args: { p_organization_id?: string }
        Returns: number
      }
      gettransactionid: { Args: never; Returns: unknown }
      has_role: { Args: { required_role: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      log_user_activity: {
        Args: {
          p_action: string
          p_description: string
          p_entity_id?: string
          p_entity_type?: string
          p_metadata?: Json
          p_user_id?: string
        }
        Returns: string
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      nearby_hospitals: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          address: string
          ambulances_count: number
          available_beds: number
          created_at: string
          display_id: string
          distance_km: number
          emergency_level: string
          features: string[]
          google_address: string
          google_opening_hours: Json
          google_phone: string
          google_photos: string[]
          google_rating: number
          google_types: string[]
          google_website: string
          id: string
          image: string
          import_status: string
          latitude: number
          longitude: number
          name: string
          org_admin_id: string
          phone: string
          place_id: string
          price_range: string
          rating: number
          service_types: string[]
          specialties: string[]
          status: string
          type: string
          updated_at: string
          verified: boolean
          wait_time: string
        }[]
      }
      on_profile_created_generate_id_logic: {
        Args: { p_id: string; p_role: string }
        Returns: undefined
      }
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
          p_currency?: string
          p_emergency_request_id: string
          p_organization_id: string
        }
        Returns: Json
      }
      process_wallet_payment: {
        Args: {
          p_amount: number
          p_currency: string
          p_emergency_request_id: string
          p_organization_id: string
          p_user_id: string
        }
        Returns: Json
      }
      reload_schema: { Args: never; Returns: undefined }
      search_auth_users: {
        Args: { search_term: string }
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          id: string
          last_sign_in_at: string
          phone: string
          profile_first_name: string
          profile_full_name: string
          profile_last_name: string
          profile_provider_type: string
          profile_role: string
          profile_username: string
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
      update_trending_topics_from_search: { Args: never; Returns: undefined }
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

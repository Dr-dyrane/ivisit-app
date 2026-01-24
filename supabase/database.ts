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
      ambulances: {
        Row: {
          call_sign: string | null
          created_at: string | null
          crew: string[] | null
          current_call: Json | null
          eta: string | null
          hospital: string | null
          hospital_id: string | null
          id: string
          last_maintenance: string | null
          location: unknown
          rating: number | null
          status: string | null
          type: string | null
          updated_at: string | null
          vehicle_number: string | null
        }
        Insert: {
          call_sign?: string | null
          created_at?: string | null
          crew?: string[] | null
          current_call?: Json | null
          eta?: string | null
          hospital?: string | null
          hospital_id?: string | null
          id: string
          last_maintenance?: string | null
          location?: unknown
          rating?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle_number?: string | null
        }
        Update: {
          call_sign?: string | null
          created_at?: string | null
          crew?: string[] | null
          current_call?: Json | null
          eta?: string | null
          hospital?: string | null
          hospital_id?: string | null
          id?: string
          last_maintenance?: string | null
          location?: unknown
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
            referencedRelation: "hospitals"
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
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergencies: {
        Row: {
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          patient_id: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          patient_id: string
          status: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          patient_id?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergencies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_requests: {
        Row: {
          ambulance_id: string | null
          ambulance_type: string | null
          bed_count: string | null
          bed_number: string | null
          bed_type: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          destination_location: unknown
          estimated_arrival: string | null
          hospital_id: string | null
          hospital_name: string | null
          id: string
          patient_heading: number | null
          patient_location: unknown
          patient_snapshot: Json | null
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
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ambulance_id?: string | null
          ambulance_type?: string | null
          bed_count?: string | null
          bed_number?: string | null
          bed_type?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          destination_location?: unknown
          estimated_arrival?: string | null
          hospital_id?: string | null
          hospital_name?: string | null
          id: string
          patient_heading?: number | null
          patient_location?: unknown
          patient_snapshot?: Json | null
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
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ambulance_id?: string | null
          ambulance_type?: string | null
          bed_count?: string | null
          bed_number?: string | null
          bed_type?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          destination_location?: unknown
          estimated_arrival?: string | null
          hospital_id?: string | null
          hospital_name?: string | null
          id?: string
          patient_heading?: number | null
          patient_location?: unknown
          patient_snapshot?: Json | null
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
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
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
      health_news: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          description: string | null
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
          content?: string | null
          created_at?: string | null
          description?: string | null
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
          content?: string | null
          created_at?: string | null
          description?: string | null
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
      hospitals: {
        Row: {
          address: string
          ambulances_count: number | null
          available_beds: number | null
          created_at: string | null
          emergency_level: string | null
          features: string[] | null
          id: string
          image: string | null
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          price_range: string | null
          rating: number | null
          service_types: string[] | null
          specialties: string[] | null
          status: string | null
          type: string | null
          updated_at: string | null
          verified: boolean | null
          wait_time: string | null
        }
        Insert: {
          address: string
          ambulances_count?: number | null
          available_beds?: number | null
          created_at?: string | null
          emergency_level?: string | null
          features?: string[] | null
          id?: string
          image?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          price_range?: string | null
          rating?: number | null
          service_types?: string[] | null
          specialties?: string[] | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          verified?: boolean | null
          wait_time?: string | null
        }
        Update: {
          address?: string
          ambulances_count?: number | null
          available_beds?: number | null
          created_at?: string | null
          emergency_level?: string | null
          features?: string[] | null
          id?: string
          image?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          price_range?: string | null
          rating?: number | null
          service_types?: string[] | null
          specialties?: string[] | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          verified?: boolean | null
          wait_time?: string | null
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
          status: string | null
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
          status?: string | null
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
          status?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
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
          last_name: string | null
          organization_id: string | null
          phone: string | null
          provider_type: string | null
          role: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          address?: string | null
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
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          provider_type?: string | null
          role?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          address?: string | null
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
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          provider_type?: string | null
          role?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      search_events: {
        Row: {
          created_at: string | null
          extra: Json | null
          id: string
          query: string | null
          selected_key: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          extra?: Json | null
          id?: string
          query?: string | null
          selected_key?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          extra?: Json | null
          id?: string
          query?: string | null
          selected_key?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      services: {
        Row: {
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          provider_id: string
          service_type: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          provider_id: string
          service_type: string
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          provider_id?: string
          service_type?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          created_at: string | null
          email: string
          id: string
          last_engagement_at: string | null
          new_user: boolean | null
          source: string | null
          status: string | null
          subscription_date: string | null
          type: string
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
          source?: string | null
          status?: string | null
          subscription_date?: string | null
          type?: string
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
          source?: string | null
          status?: string | null
          subscription_date?: string | null
          type?: string
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
      users: {
        Row: {
          id: string
          last_seen: string | null
          latitude: number
          longitude: number
        }
        Insert: {
          id: string
          last_seen?: string | null
          latitude: number
          longitude: number
        }
        Update: {
          id?: string
          last_seen?: string | null
          latitude?: number
          longitude?: number
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      subscriber_analytics: {
        Row: {
          active_subscribers: number | null
          date: string | null
          free_subscribers: number | null
          new_users: number | null
          paid_conversion_rate: number | null
          paid_subscribers: number | null
          total_subscribers: number | null
          welcome_emails_sent: number | null
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
      current_user_is_admin: { Args: never; Returns: boolean }
      delete_user: { Args: never; Returns: undefined }
      delete_user_by_admin: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      disablelongtransactions: { Args: never; Returns: string }
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
        Args: { target_user_id: string }
        Returns: undefined
      }
      ensure_admin_consistency: { Args: never; Returns: undefined }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
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
          banned_until: string
          created_at: string
          email: string
          email_confirmed_at: string
          id: string
          last_sign_in_at: string
          phone: string
          phone_confirmed_at: string
          profile_bvn_verified: boolean
          profile_first_name: string
          profile_full_name: string
          profile_last_name: string
          profile_organization_id: string
          profile_provider_type: string
          profile_role: string
          profile_username: string
          updated_at: string
        }[]
      }
      get_current_user_org_id: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
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
      get_search_analytics:
        | {
            Args: never
            Returns: {
              query: string
              rank: number
              search_count: number
            }[]
          }
        | {
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
      gettransactionid: { Args: never; Returns: unknown }
      has_role: { Args: { required_role: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const
